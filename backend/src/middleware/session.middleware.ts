import type { RequestHandler, Response } from 'express';
import type { AuthConfig } from '../config/auth.config';
import type { AuthStore } from '../db/auth.repository';
import { equalToken, hash, isToken } from '../utils/auth.util';
import { HttpError } from '../utils/http-error.util';

export interface SessionContext {
  userId: string;
  tokenHash: string;
  csrfToken: string;
}
export function sessionContext(res: Response): SessionContext {
  return res.locals.session;
}

export function createSessionMiddleware(store: AuthStore, config: AuthConfig) {
  const requireSession: RequestHandler = async (req, res, next) => {
    const cookie = config.production
      ? '__Host-drivepool_session'
      : 'drivepool_session';
    const token: unknown = req.cookies?.[cookie];
    const session = isToken(token)
      ? await store.findSession(hash(token))
      : null;
    if (!session || !isToken(token))
      throw new HttpError(401, 'unauthenticated', 'Sign in to continue.');
    res.locals.session = {
      userId: session.user.id,
      tokenHash: hash(token),
      csrfToken: session.csrfToken,
    } satisfies SessionContext;
    next();
  };
  const requireCsrf: RequestHandler = (req, res, next) => {
    const csrf = req.get('X-CSRF-Token');
    if (
      req.get('Origin') !== config.appOrigin ||
      !csrf ||
      !equalToken(csrf, sessionContext(res).csrfToken)
    ) {
      throw new HttpError(
        403,
        'csrf_failed',
        'The request could not be verified.',
      );
    }
    next();
  };
  return { requireSession, requireCsrf };
}
