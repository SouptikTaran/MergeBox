import { createApp } from './app';
import { readAuthConfig } from './config/auth.config';
import { createGoogleProvider } from './services/google.service';
import { createAuthStore } from './db/auth.repository';
import { closeDatabase, db } from './db';

const config = readAuthConfig();
const store = createAuthStore(db);
const app = createApp(store, createGoogleProvider(config), config);
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
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(cleanup);
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
