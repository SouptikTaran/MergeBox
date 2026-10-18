import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

export const authResponseHeaders: RequestHandler = (_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  });
  next();
};

export function createLoginRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'rate_limited',
          message: 'Too many sign-in attempts. Try again later.',
        },
      });
    },
  });
}
