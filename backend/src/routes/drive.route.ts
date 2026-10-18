import { Router } from 'express';
import type { AuthConfig } from '../config/auth.config';
import { createDriveController } from '../controllers/drive.controller';
import type { AuthStore } from '../db/auth.repository';
import type { DriveRepository } from '../db/drive.repository';
import {
  authResponseHeaders,
  createLoginRateLimit,
} from '../middleware/auth.middleware';
import { createSessionMiddleware } from '../middleware/session.middleware';
import type { GoogleProvider } from '../services/google.service';
import type { TokenEncryption } from '../services/token-encryption.service';

export interface DriveDependencies {
  repository: DriveRepository;
  google: GoogleProvider;
  encryption: TokenEncryption;
}
export function createDriveRouter(
  auth: AuthStore,
  dependencies: DriveDependencies,
  config: AuthConfig,
) {
  const router = Router();
  const { requireSession, requireCsrf } = createSessionMiddleware(auth, config);
  const controller = createDriveController(
    dependencies.repository,
    dependencies.google,
    dependencies.encryption,
    config,
  );
  const rateLimit = createLoginRateLimit();
  router.use(authResponseHeaders, requireSession);
  router.get('/accounts', controller.list);
  router.post('/accounts/connect', requireCsrf, rateLimit, controller.connect);
  router.post(
    '/accounts/:id/reconnect',
    requireCsrf,
    rateLimit,
    controller.connect,
  );
  router.get('/oauth/callback', rateLimit, controller.callback);
  return router;
}
