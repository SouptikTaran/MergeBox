const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./helpers/integration.cjs');
const h = createHarness();

test('storage preserves exact bytes and uses all-service usage for free space', async () => {
  const user = await login();
  await connect(user, 'large-quota');
  await connect(user, 'normal-quota');
  await h.pg.exec(
    "UPDATE drive_accounts SET email = google_subject || '@gmail.com'",
  );
  const data = await (
    await h.request('/api/drive/storage', { headers: user.headers })
  ).json();
  assert.equal(
    data.combined.total,
    (18014398509481986n + 15000000000n).toString(),
  );
  assert.equal(
    data.combined.used,
    (9007199254740993n + 4000000000n).toString(),
  );
  assert.equal(
    data.combined.free,
    (9007199254740993n + 11000000000n).toString(),
  );
  assert.equal(data.combined.complete, true);
  assert.equal(data.partial, false);
});
test('unknown shared quotas and unlimited accounts are excluded from combined totals', async () => {
  const user = await login();
  await connect(user, 'work-account');
  await connect(user, 'unlimited');
  const data = await (
    await h.request('/api/drive/storage', { headers: user.headers })
  ).json();
  assert.equal(data.combined.total, '0');
  assert.equal(data.combined.excludedAccountIds.length, 2);
  assert.equal(data.combined.complete, false);
  assert.equal(
    data.accounts.find((a) => a.quota.capacityKind === 'unlimited').quota.total,
    null,
  );
});
test('storage reports per-account failures without losing healthy accounts', async () => {
  const user = await login();
  await connect(user, 'healthy');
  await connect(user, 'quota-invalid');
  const data = await (
    await h.request('/api/drive/storage', { headers: user.headers })
  ).json();
  assert.equal(data.accounts.length, 2);
  assert.equal(data.partial, true);
  assert.equal(data.accounts.filter((a) => a.quota).length, 1);
  assert.equal(data.accounts.find((a) => a.error).error, 'invalid_quota');
});

async function accountId() {
  return (await h.pg.query('SELECT id FROM drive_accounts')).rows[0].id;
}

test('disconnect revokes the grant and removes local account data idempotently', async () => {
  const user = await login();
  await connect(user, 'drive-one');
  const id = await accountId();
  assert.equal(
    await h.access.accessToken(user.user.id, id),
    'access:drive-one',
  );
  const pending = await beginConnection(user, 'drive-one');
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal(
      (
        await h.request(`/api/drive/accounts/${id}`, {
          method: 'DELETE',
          headers: user.headers,
        })
      ).status,
      204,
    );
  }
  assert.equal(
    (await h.pg.query('SELECT count(*)::int AS count FROM drive_accounts'))
      .rows[0].count,
    0,
  );
  const staleCallback = await h.request(pending.callback, {
    headers: { Cookie: `${user.session}; ${pending.binding}` },
  });
  assert.match(staleCallback.headers.get('location'), /drive=invalid_state$/);
  await assert.rejects(h.access.accessToken(user.user.id, id), {
    code: 'account_not_found',
  });
});
test('another user cannot disconnect or refresh someone else’s account', async () => {
  const owner = await login();
  await connect(owner, 'drive-one');
  const id = await accountId();
  const other = await login('other-user');
  await h.request(`/api/drive/accounts/${id}`, {
    method: 'DELETE',
    headers: other.headers,
  });
  assert.equal(
    (await h.pg.query('SELECT count(*)::int AS count FROM drive_accounts'))
      .rows[0].count,
    1,
  );
  await assert.rejects(h.access.accessToken(other.user.id, id), {
    code: 'account_not_found',
  });
});
test('invalid refresh grant requires reconnect; transient failures do not', async () => {
  const user = await login();
  await connect(user, 'revoked');
  const id = await accountId();
  await assert.rejects(h.access.accessToken(user.user.id, id), {
    code: 'reconnect_required',
  });
  assert.equal(
    (await h.pg.query('SELECT status FROM drive_accounts')).rows[0].status,
    'reconnect',
  );
  assert.match(
    (await connect(user, 'revoked', 'no_refresh', id)).headers.get('location'),
    /drive=reconnect_required$/,
  );
  await h.pg.exec('TRUNCATE drive_accounts');
  await connect(user, 'refresh-outage');
  await assert.rejects(h.access.accessToken(user.user.id, await accountId()), {
    code: 'provider_unavailable',
  });
  assert.equal(
    (await h.pg.query('SELECT status FROM drive_accounts')).rows[0].status,
    'active',
  );
});
test('revocation failures disable access immediately and bound credential retention', async () => {
  const user = await login();
  await connect(user, 'revoke-failure');
  const id = await accountId();
  assert.equal(
    (
      await h.request(`/api/drive/accounts/${id}`, {
        method: 'DELETE',
        headers: user.headers,
      })
    ).status,
    202,
  );
  await assert.rejects(h.access.accessToken(user.user.id, id), {
    code: 'account_not_found',
  });
  await h.access.retryDisconnects();
  assert.equal(
    (await h.pg.query('SELECT status FROM drive_accounts')).rows[0].status,
    'disconnecting',
  );
  await h.pg.exec(
    "UPDATE drive_accounts SET updated_at = now() - interval '25 hours'",
  );
  await h.access.retryDisconnects();
  assert.equal(
    (await h.pg.query('SELECT count(*)::int AS count FROM drive_accounts'))
      .rows[0].count,
    0,
  );
});

async function login(subject = 'application-user') {
  const { session } = await h.signIn('success', { subject });
  const profile = await (
    await h.request('/api/auth/me', { headers: { Cookie: session } })
  ).json();
  return {
    session,
    user: profile.user,
    headers: {
      Cookie: session,
      Origin: h.config.appOrigin,
      'X-CSRF-Token': profile.csrfToken,
    },
  };
}
async function beginConnection(user, subject, scenario = 'success', id) {
  const started = await h.request(
    id ? `/api/drive/accounts/${id}/reconnect` : '/api/drive/accounts/connect',
    { method: 'POST', headers: user.headers },
  );
  assert.equal(started.status, 200);
  const url = new URL((await started.json()).authorizationUrl);
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.ok(url.searchParams.get('scope').includes('drive.metadata.readonly'));
  url.searchParams.set('subject', subject);
  url.searchParams.set('scenario', scenario);
  const authorized = await fetch(url, { redirect: 'manual' });
  const callback = new URL(authorized.headers.get('location'));
  return {
    callback: callback.pathname + callback.search,
    binding: h.cookie(started, 'drivepool_drive_oauth'),
  };
}
async function connect(user, subject, scenario = 'success', id) {
  const flow = await beginConnection(user, subject, scenario, id);
  return h.request(flow.callback, {
    headers: { Cookie: `${user.session}; ${flow.binding}` },
  });
}

test('connects two accounts, encrypts tokens and exposes only safe fields', async () => {
  const user = await login();
  for (const subject of ['drive-one', 'drive-two']) {
    assert.match(
      (await connect(user, subject)).headers.get('location'),
      /drive=connected$/,
    );
  }
  const response = await h.request('/api/drive/accounts', {
    headers: user.headers,
  });
  const data = await response.json();
  assert.equal(data.accounts.length, 2);
  assert.equal(JSON.stringify(data).includes('refresh'), false);
  const saved = await h.pg.query('SELECT * FROM drive_accounts');
  for (const account of saved.rows) {
    assert.equal(account.encrypted_refresh_token.includes('refresh-'), false);
    assert.equal(
      await h.encryption.decrypt(
        account.encrypted_refresh_token,
        `${user.user.id}:${account.google_subject}`,
      ),
      `refresh-${account.google_subject}`,
    );
  }
  const me = await (
    await h.request('/api/auth/me', { headers: user.headers })
  ).json();
  assert.equal(me.user.id, user.user.id);
});
test('connection requires session and CSRF', async () => {
  assert.equal(
    (await h.request('/api/drive/accounts/connect', { method: 'POST' })).status,
    401,
  );
  const user = await login();
  assert.equal(
    (
      await h.request('/api/drive/accounts/connect', {
        method: 'POST',
        headers: { Cookie: user.session },
      })
    ).status,
    403,
  );
});
test('callback is bound to the initiating session and consumed once', async () => {
  const user = await login();
  const other = await login('other-user');
  const flow = await beginConnection(user, 'drive-one');
  const wrong = await h.request(flow.callback, {
    headers: { Cookie: `${other.session}; ${flow.binding}` },
  });
  assert.match(wrong.headers.get('location'), /drive=invalid_state$/);
  const right = await h.request(flow.callback, {
    headers: { Cookie: `${user.session}; ${flow.binding}` },
  });
  assert.match(right.headers.get('location'), /drive=connected$/);
  const replay = await h.request(flow.callback, {
    headers: { Cookie: `${user.session}; ${flow.binding}` },
  });
  assert.match(replay.headers.get('location'), /drive=invalid_state$/);
});
test('does not duplicate an account or transfer it to another app user', async () => {
  const user = await login();
  await connect(user, 'drive-one');
  await connect(user, 'drive-one');
  const other = await login('other-user');
  assert.match(
    (await connect(other, 'drive-one')).headers.get('location'),
    /drive=account_conflict$/,
  );
  assert.equal(
    (await h.pg.query('SELECT count(*)::int AS count FROM drive_accounts'))
      .rows[0].count,
    1,
  );
  assert.deepEqual(
    (
      await (
        await h.request('/api/drive/accounts', { headers: other.headers })
      ).json()
    ).accounts,
    [],
  );
});
for (const [scenario, expected] of [
  ['no_refresh', 'reconnect_required'],
  ['missing_scope', 'missing_scope'],
  ['denied', 'consent_denied'],
]) {
  test(`does not connect a new account with ${scenario}`, async () => {
    const user = await login();
    assert.ok(
      (await connect(user, 'drive-one', scenario)).headers
        .get('location')
        .endsWith(`drive=${expected}`),
    );
    assert.equal(
      (await h.pg.query('SELECT count(*)::int AS count FROM drive_accounts'))
        .rows[0].count,
      0,
    );
  });
}
test('preserves a valid refresh token when Google omits a replacement', async () => {
  const user = await login();
  await connect(user, 'drive-one');
  const first = (
    await h.pg.query('SELECT encrypted_refresh_token FROM drive_accounts')
  ).rows[0].encrypted_refresh_token;
  assert.match(
    (await connect(user, 'drive-one', 'no_refresh')).headers.get('location'),
    /drive=connected$/,
  );
  assert.equal(
    (await h.pg.query('SELECT encrypted_refresh_token FROM drive_accounts'))
      .rows[0].encrypted_refresh_token,
    first,
  );
});
test('reconnect verifies the expected Google account', async () => {
  const user = await login();
  await connect(user, 'drive-one');
  const account = (await h.pg.query('SELECT id FROM drive_accounts')).rows[0];
  assert.match(
    (await connect(user, 'different-drive', 'success', account.id)).headers.get(
      'location',
    ),
    /drive=wrong_account$/,
  );
  assert.equal(
    (await h.pg.query('SELECT count(*)::int AS count FROM drive_accounts'))
      .rows[0].count,
    1,
  );
});
