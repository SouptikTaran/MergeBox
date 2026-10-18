import { createApp } from './app';
import { readAuthConfig } from './config/auth.config';
import { createGoogleProvider } from './services/google.service';
import { createAuthStore } from './db/auth.repository';
import { closeDatabase, db } from './db';
import { createDriveRepository } from './db/drive.repository';
import { configuredTokenEncryption } from './services/token-encryption.service';
import { createDriveAccess } from './services/drive-access.service';
import { createDriveApi } from './services/drive-api.service';
import { createStorageService } from './services/storage.service';

const config = readAuthConfig();
const store = createAuthStore(db);
const driveRepository = createDriveRepository(db);
const encryption = configuredTokenEncryption();
const driveAccess = createDriveAccess(driveRepository, encryption, config);
const driveApi = createDriveApi(driveAccess, driveRepository);
const app = createApp(store, createGoogleProvider(config), config, {
  repository: driveRepository,
  google: createGoogleProvider(config, undefined, undefined, 'drive'),
  encryption,
  access: driveAccess,
  storage: createStorageService(driveRepository, driveApi),
});
const port = Number(process.env.PORT || 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be between 1 and 65535.');

const server = app.listen(port, () => {
  console.log(`Backend Started: http://localhost:${port}`);
});
// Expiry is also enforced on every read; cleanup is safe across multiple processes.
const cleanup = setInterval(
  () => {
    store.cleanup().catch(() => {
      console.error('Expired authentication data cleanup failed.');
    });
  },
  15 * 60 * 1000,
);
cleanup.unref();
let retryingDisconnects = false;
const disconnectCleanup = setInterval(() => {
  if (retryingDisconnects) return;
  retryingDisconnects = true;
  driveAccess
    .retryDisconnects()
    .catch(() => {
      console.error('Drive revocation retry failed.');
    })
    .finally(() => {
      retryingDisconnects = false;
    });
}, 60_000);
disconnectCleanup.unref();
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(cleanup);
  clearInterval(disconnectCleanup);
  const deadline = setTimeout(() => {
    process.exit(1);
  }, 15_000);
  deadline.unref();
  server.close(() => {
    closeDatabase()
      .then(() => {
        clearTimeout(deadline);
      })
      .catch(() => {
        process.exitCode = 1;
      });
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
