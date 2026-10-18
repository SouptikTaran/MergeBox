// Local-only OAuth simulator based on Google's OIDC authorization/token contracts.
// Never deploy this simulator: it intentionally grants test identities without login.
const http = require('node:http');
const crypto = require('node:crypto');
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const wrongKeys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = {
  ...keys.publicKey.export({ format: 'jwk' }),
  kid: 'local-test',
  alg: 'RS256',
  use: 'sig',
};
const fallback = new Map();
const state =
  typeof pm === 'undefined'
    ? { get: (k) => fallback.get(k), set: (k, v) => fallback.set(k, v) }
    : pm.state;
const encode = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

async function body(req) {
  if (req.body !== undefined)
    return typeof req.body === 'string'
      ? new URLSearchParams(req.body)
      : new URLSearchParams(req.body);
  let text = '';
  for await (const chunk of req) text += chunk;
  return new URLSearchParams(text);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/jwks') return send(res, 200, { keys: [jwk] });
    if (url.pathname === '/drive/v3/files') {
      if (!req.headers.authorization?.startsWith('Bearer access:')) return send(res, 401, { error: { code: 401 } });
      const subject = req.headers.authorization.slice('Bearer access:'.length);
      if (subject === 'files-outage') return send(res, 503, { error: { code: 503 } });
      if (url.searchParams.get('q') !== "'me' in owners and trashed = false") return send(res, 400, { error: { code: 400 } });
      const file = (id, name, size, link = 'https://drive.google.com/file/d/' + id + '/view') => ({ id, name, mimeType: size ? 'application/pdf' : 'application/vnd.google-apps.document', ...(size ? { size } : {}), modifiedTime: '2026-10-18T10:00:00Z', webViewLink: link });
      if (subject === 'files-empty') return send(res, 200, { files: [] });
      if (url.searchParams.has('pageToken')) return send(res, 200, { files: [file('a', 'Alpha', '9007199254740993'), file('z', 'Zebra', '42'), file('n', 'Native document', null, 'javascript:alert(1)')] });
      return send(res, 200, { files: [file('z', 'Zebra', '42')], nextPageToken: 'page-two' });
    }
    if (url.pathname === '/drive/v3/about') {
      const subject = (req.headers.authorization || '').replace(
        'Bearer access:',
        '',
      );
      if (!req.headers.authorization?.startsWith('Bearer access:'))
        return send(res, 401, { error: { code: 401 } });
      if (subject === 'quota-outage')
        return send(res, 503, { error: { code: 503 } });
      if (subject === 'quota-invalid')
        return send(res, 200, { storageQuota: { usage: 'invalid' } });
      return send(res, 200, {
        storageQuota: {
          ...(subject === 'unlimited'
            ? {}
            : {
                limit:
                  subject === 'large-quota'
                    ? '18014398509481986'
                    : '15000000000',
              }),
          usage: subject === 'large-quota' ? '9007199254740993' : '4000000000',
          usageInDrive: '1000000000',
          usageInDriveTrash: '10000000',
        },
      });
    }
    if (url.pathname === '/authorize') {
      const p = Object.fromEntries(url.searchParams);
      if (
        !p.state ||
        !p.nonce ||
        !p.code_challenge ||
        p.code_challenge_method !== 'S256'
      )
        return send(res, 400, { error: 'invalid_request' });
      const callback = new URL(p.redirect_uri);
      callback.searchParams.set('state', p.state);
      if (p.scenario === 'denied')
        callback.searchParams.set('error', 'access_denied');
      else {
        const code = crypto.randomBytes(24).toString('hex');
        await state.set(`google:code:${code}`, p);
        callback.searchParams.set('code', code);
      }
      res.writeHead(302, { Location: callback.toString() });
      return res.end();
    }
    if (url.pathname === '/revoke' && req.method === 'POST') {
      const p = await body(req);
      if (p.get('token') === 'refresh-revoke-failure')
        return send(res, 503, { error: 'temporarily_unavailable' });
      if (p.get('token') === 'refresh-already-revoked')
        return send(res, 400, { error: 'invalid_token' });
      return send(res, 200, {});
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      const p = await body(req);
      if (p.get('grant_type') === 'refresh_token') {
        if (
          p.get('client_id') !== 'test-client' ||
          p.get('client_secret') !== 'test-secret'
        )
          return send(res, 400, { error: 'invalid_client' });
        const token = p.get('refresh_token') || '';
        if (token === 'refresh-revoked')
          return send(res, 400, { error: 'invalid_grant' });
        if (token === 'refresh-refresh-outage')
          return send(res, 503, { error: 'temporarily_unavailable' });
        return send(res, 200, {
          access_token: `access:${token.slice(8)}`,
          expires_in: 3600,
          token_type: 'Bearer',
        });
      }
      const grant = await state.get(`google:code:${p.get('code')}`);
      await state.set(`google:code:${p.get('code')}`, null);
      if (
        !grant ||
        p.get('client_id') !== grant.client_id ||
        p.get('client_secret') !== 'test-secret' ||
        p.get('redirect_uri') !== grant.redirect_uri ||
        p.get('grant_type') !== 'authorization_code' ||
        crypto
          .createHash('sha256')
          .update(p.get('code_verifier') || '')
          .digest('base64url') !== grant.code_challenge
      )
        return send(res, 400, { error: 'invalid_grant' });
      if (grant.scenario === 'outage')
        return send(res, 503, { error: 'temporarily_unavailable' });
      if (grant.scenario === 'rate_limit')
        return send(res, 429, { error: 'rate_limit_exceeded' });
      if (grant.scenario === 'timeout') {
        await new Promise((r) => setTimeout(r, 1200));
        return send(res, 503, {});
      }
      if (grant.scenario === 'html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end('<h1>Unavailable</h1>');
      }
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        iss: 'https://accounts.google.com',
        aud: grant.client_id,
        sub: grant.subject || 'google-user-1',
        email: grant.email || 'test@example.com',
        email_verified: true,
        name: 'Test User',
        nonce: grant.nonce,
        iat: now,
        exp: now + 3600,
      };
      if (grant.scenario === 'nonce') claims.nonce = 'wrong';
      if (grant.scenario === 'issuer') claims.iss = 'https://attacker.invalid';
      if (grant.scenario === 'audience') claims.aud = 'another-client';
      if (grant.scenario === 'expired') claims.exp = now - 60;
      if (grant.scenario === 'unverified') claims.email_verified = false;
      if (grant.scenario === 'missing_exp') delete claims.exp;
      const unsigned = `${encode({ alg: 'RS256', kid: 'local-test' })}.${encode(claims)}`;
      const signature = crypto
        .sign(
          'RSA-SHA256',
          Buffer.from(unsigned),
          grant.scenario === 'signature'
            ? wrongKeys.privateKey
            : keys.privateKey,
        )
        .toString('base64url');
      return send(res, 200, {
        id_token: `${unsigned}.${signature}`,
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        ...(grant.access_type === 'offline' && grant.scenario !== 'no_refresh'
          ? { refresh_token: `refresh-${grant.subject || 'google-user-1'}` }
          : {}),
        scope:
          grant.scenario === 'missing_scope'
            ? 'openid email profile'
            : grant.scope,
      });
    }
    return send(res, 501, { error: 'Endpoint not modeled' });
  } catch {
    return send(res, 500, { error: 'Simulator failure' });
  }
});
server.listen(Number(process.env.PORT || 0), '127.0.0.1', () => {
  if (process.send) process.send({ port: server.address().port });
});
