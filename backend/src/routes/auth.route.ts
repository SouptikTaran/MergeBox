import { Router } from 'express';
import type { AuthConfig } from '../config/auth.config';
import { createAuthController } from '../controllers/auth.controller';
import type { AuthStore } from '../db/auth.repository';
import {
  authResponseHeaders,
  createLoginRateLimit,
} from '../middleware/auth.middleware';
import type { GoogleProvider } from '../services/google.service';

export function createAuthRouter(
  store: AuthStore,
  google: GoogleProvider,
  config: AuthConfig,
) {
  const router = Router();
  const controller = createAuthController(store, google, config);
  const loginRateLimit = createLoginRateLimit();

  router.use(authResponseHeaders);
  router.get('/google', loginRateLimit, controller.googleSignIn);
  router.get('/google/callback', loginRateLimit, controller.googleCallback);
  router.get('/me', controller.me);
  router.post('/logout', controller.logout);

  return router;
}
