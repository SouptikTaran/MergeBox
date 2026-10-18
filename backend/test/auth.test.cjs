const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hash, randomToken } = require('../dist/utils/auth.util');
const { createHarness } = require('./helpers/integration.cjs');
const h = createHarness();
const { config, request, cookie, begin, signIn, close, startApp } = h;

test('login, hashed session, profile, CSRF protection and logout', async () => {
  const login = await signIn();
  assert.equal(
    login.response.headers.get('location'),
    `${config.appOrigin}/?auth=success`,
  );
  assert.ok(login.session);
  const saved = await h.pg.query('SELECT token_hash FROM sessions');
  assert.equal(saved.rows[0].token_hash, hash(login.session.split('=')[1]));
  const me = await request('/api/auth/me', {
    headers: { Cookie: login.session },
  });
  assert.equal(me.status, 200);
  assert.equal(me.headers.get('cache-control'), 'no-store');
  const profile = await me.json();
  assert.equal(profile.user.email, 'test@example.com');
  assert.equal('tokenHash' in profile, false);
  for (const headers of [
    { Origin: config.appOrigin },
    { Origin: 'http://evil.invalid', 'X-CSRF-Token': profile.csrfToken },
  ]) {
    assert.equal(
      (
        await request('/api/auth/logout', {
          method: 'POST',
          headers: { Cookie: login.session, ...headers },
        })
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await request('/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: login.session,
          Origin: config.appOrigin,
          'X-CSRF-Token': profile.csrfToken,
        },
      })
    ).status,
    204,
  );
  assert.equal(
    (await request('/api/auth/me', { headers: { Cookie: login.session } }))
      .status,
    401,
  );
});
test('callback replay, missing and incorrect browser bindings are rejected', async () => {
  const flow = await begin();
  for (const headers of [{}, { Cookie: `drivepool_oauth=${randomToken()}` }]) {
    const result = await request(flow.callback, { headers });
    assert.match(result.headers.get('location'), /auth=invalid_state$/);
  }
  const first = await request(flow.callback, {
    headers: { Cookie: flow.cookie },
  });
  assert.match(first.headers.get('location'), /auth=success$/);
  const replay = await request(flow.callback, {
    headers: { Cookie: flow.cookie },
  });
  assert.match(replay.headers.get('location'), /auth=invalid_state$/);
  assert.equal(
    (await h.pg.query('SELECT count(*)::int AS count FROM sessions')).rows[0]
      .count,
    1,
  );
});
test('expired OAuth state cannot establish a session', async () => {
  const flow = await begin();
  await h.pg.exec(
    "UPDATE oauth_transactions SET expires_at = now() - interval '1 minute'",
  );
  const response = await request(flow.callback, {
    headers: { Cookie: flow.cookie },
  });
  assert.match(response.headers.get('location'), /auth=invalid_state$/);
});
for (const scenario of [
  'nonce',
  'issuer',
  'audience',
  'expired',
  'unverified',
  'signature',
  'missing_exp',
  'html',
]) {
  test(`rejects ${scenario} identity response`, async () => {
    const login = await signIn(scenario);
    assert.match(
      login.response.headers.get('location'),
      /auth=invalid_identity$/,
    );
    assert.equal(login.session, undefined);
    assert.equal(
      (await h.pg.query('SELECT count(*)::int AS count FROM users')).rows[0]
        .count,
      0,
    );
  });
}
for (const scenario of ['outage', 'rate_limit', 'timeout', 'denied']) {
  test(`handles provider ${scenario} without creating a session`, async () => {
    const login = await signIn(scenario);
    assert.match(
      login.response.headers.get('location'),
      scenario === 'denied'
        ? /auth=consent_denied$/
        : /auth=provider_unavailable$/,
    );
    assert.equal(login.session, undefined);
  });
}
test('returning identity updates email and rotates the session without duplicate users', async () => {
  const first = await signIn();
  const second = await signIn(
    'success',
    { email: 'changed@example.com' },
    first.session,
  );
  assert.notEqual(first.session, second.session);
  assert.equal(
    (await h.pg.query('SELECT count(*)::int AS count FROM users')).rows[0]
      .count,
    1,
  );
  assert.equal(
    (await request('/api/auth/me', { headers: { Cookie: first.session } }))
      .status,
    401,
  );
  const me = await request('/api/auth/me', {
    headers: { Cookie: second.session },
  });
  assert.equal((await me.json()).user.email, 'changed@example.com');
});
test('different subjects with the same email are not auto-linked', async () => {
  await signIn();
  await signIn('success', { subject: 'second-google-user' });
  assert.equal(
    (await h.pg.query('SELECT count(*)::int AS count FROM users')).rows[0]
      .count,
    2,
  );
});
test('session survives app recreation, expires, and cleanup removes expired rows', async () => {
  const login = await signIn();
  await close();
  await startApp();
  assert.equal(
    (await request('/api/auth/me', { headers: { Cookie: login.session } }))
      .status,
    200,
  );
  await h.pg.exec(
    "UPDATE sessions SET expires_at = now() - interval '1 minute'",
  );
  assert.equal(
    (await request('/api/auth/me', { headers: { Cookie: login.session } }))
      .status,
    401,
  );
  await h.store.cleanup();
  assert.equal(
    (await h.pg.query('SELECT count(*)::int AS count FROM sessions')).rows[0]
      .count,
    0,
  );
});
test('concurrent callbacks consume a transaction once', async () => {
  const flow = await begin();
  const responses = await Promise.all(
    [1, 2].map(() =>
      request(flow.callback, { headers: { Cookie: flow.cookie } }),
    ),
  );
  assert.deepEqual(
    responses
      .map((r) => new URL(r.headers.get('location')).searchParams.get('auth'))
      .sort(),
    ['invalid_state', 'success'],
  );
});
test('production cookie attributes and missing configuration behavior', async () => {
  await close();
  await startApp({ production: true });
  const response = await request('/api/auth/google');
  const header = response.headers.getSetCookie()[0];
  assert.match(header, /^__Host-drivepool_oauth=/);
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/'])
    assert.ok(header.includes(flag));
  await close();
  await startApp({ clientId: '', clientSecret: '' });
  assert.equal((await request('/api/auth/google')).status, 503);
});
