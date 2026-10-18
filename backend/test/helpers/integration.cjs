function createHarness() {
  const { test, before, after, beforeEach, afterEach } = require('node:test');
  const assert = require('node:assert/strict');
  const { once } = require('node:events');
  const { fork } = require('node:child_process');
  const path = require('node:path');
  const { PGlite } = require('@electric-sql/pglite');
  const { drizzle } = require('drizzle-orm/pglite');
  const { migrate } = require('drizzle-orm/pglite/migrator');
  const { createApp } = require('../../dist/app');
  const { createAuthStore } = require('../../dist/db/auth.repository');
  const {
    createGoogleProvider,
  } = require('../../dist/services/google.service');
  const { hash, randomToken } = require('../../dist/utils/auth.util');
  const schema = require('../../dist/db/schema');
  const { createDriveRepository } = require('../../dist/db/drive.repository');
  const { createDriveApi } = require('../../dist/services/drive-api.service');
  const {
    createStorageService,
  } = require('../../dist/services/storage.service');
  const {
    createDriveAccess,
  } = require('../../dist/services/drive-access.service');
  const {
    createTokenEncryption,
  } = require('../../dist/services/token-encryption.service');
  const { randomBytes } = require('node:crypto');
  const encryption = createTokenEncryption(randomBytes(32).toString('base64'));
  let pg, db, store, server, base, simulator, upstream, access;
  const config = {
    clientId: 'test-client',
    clientSecret: 'test-secret',
    appOrigin: 'http://localhost:3000',
    apiOrigin: 'http://localhost:8000',
    production: false,
  };

  before(async () => {
    if (process.env.OAUTH_SIM_URL) upstream = process.env.OAUTH_SIM_URL;
    else {
      simulator = fork(path.resolve('../postman/mocks/google/default.js'), [], {
        env: { ...process.env, PORT: '0' },
        stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
      });
      const [message] = await once(simulator, 'message');
      upstream = `http://127.0.0.1:${message.port}`;
    }
    pg = new PGlite();
    db = drizzle(pg, { schema });
    await migrate(db, { migrationsFolder: path.resolve('drizzle') });
    store = createAuthStore(db);
  });
  async function startApp(overrides = {}) {
    const current = { ...config, ...overrides };
    const provider = createGoogleProvider(
      current,
      {
        authorize: `${upstream}/authorize`,
        token: `${upstream}/token`,
        jwks: `${upstream}/jwks`,
      },
      600,
    );
    access = createDriveAccess(
      createDriveRepository(db),
      encryption,
      current,
      { token: `${upstream}/token`, revoke: `${upstream}/revoke` },
      600,
    );
    server = createApp(store, provider, current, {
      repository: createDriveRepository(db),
      encryption,
      access,
      storage: createStorageService(
        createDriveRepository(db),
        createDriveApi(
          access,
          createDriveRepository(db),
          upstream + '/drive/v3',
          600,
        ),
      ),
      google: createGoogleProvider(
        current,
        {
          authorize: upstream + '/authorize',
          token: upstream + '/token',
          jwks: upstream + '/jwks',
        },
        600,
        'drive',
      ),
    }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}`;
  }
  const close = () =>
    new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  beforeEach(async () => {
    await pg.exec(
      'TRUNCATE users, auth_identities, sessions, oauth_transactions CASCADE',
    );
    await startApp();
  });
  afterEach(close);
  after(async () => {
    if (simulator) {
      simulator.kill();
      await once(simulator, 'exit');
    }
    await pg.close();
  });
  const request = (route, options = {}) =>
    fetch(`${base}${route}`, { redirect: 'manual', ...options });
  function cookie(response, name) {
    return response.headers
      .getSetCookie()
      .find((value) => value.startsWith(`${name}=`))
      ?.split(';')[0];
  }
  async function begin(scenario = 'success', extra = {}) {
    const response = await request('/api/auth/google');
    assert.equal(response.status, 302);
    const authorization = new URL(response.headers.get('location'));
    assert.equal(
      authorization.searchParams.get('scope'),
      'openid email profile',
    );
    assert.equal(authorization.searchParams.get('access_type'), 'online');
    authorization.searchParams.set('scenario', scenario);
    for (const [key, value] of Object.entries(extra))
      authorization.searchParams.set(key, value);
    const authorized = await fetch(authorization, { redirect: 'manual' });
    assert.equal(authorized.status, 302);
    const callback = new URL(authorized.headers.get('location'));
    return {
      callback: callback.pathname + callback.search,
      cookie: cookie(response, 'drivepool_oauth'),
      state: callback.searchParams.get('state'),
    };
  }
  async function signIn(scenario = 'success', extra = {}, previousCookie = '') {
    const flow = await begin(scenario, extra);
    const response = await request(flow.callback, {
      headers: {
        Cookie: [flow.cookie, previousCookie].filter(Boolean).join('; '),
      },
    });
    return {
      ...flow,
      response,
      session: cookie(response, 'drivepool_session'),
    };
  }

  return {
    get access() {
      return access;
    },
    config,
    request,
    cookie,
    begin,
    signIn,
    close,
    startApp,
    encryption,
    get pg() {
      return pg;
    },
    get store() {
      return store;
    },
  };
}
module.exports = { createHarness };
