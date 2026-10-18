import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import router from './routes/index.route';
import { createAuthRouter } from './routes/auth.route';
import type { AuthConfig } from './config/auth.config';
import type { AuthStore } from './db/auth.repository';
import type { GoogleProvider } from './services/google.service';
import { handleError } from './middleware/error.middleware';

export function createApp(
  store: AuthStore,
  google: GoogleProvider,
  config: AuthConfig,
) {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    cors({
      origin: config.appOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  app.use('/api/auth', createAuthRouter(store, google, config));
  app.use(router);
  app.get('/health', (_req, res) => {
    res.send('Backend is running');
  });
  app.use(handleError);
  return app;
}
