import type { CookieOptions, Request, Response } from 'express';
import type { AuthConfig } from '../config/auth.config';
import { equalToken, hash, isToken, randomToken } from '../utils/auth.util';
import { OAuthFailure } from '../services/google.service';
import type { GoogleProvider } from '../services/google.service';
import type { AuthStore } from '../db/auth.repository';

const TRANSACTION_MS = 10 * 60 * 1000;
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function createAuthController(
  store: AuthStore,
  google: GoogleProvider,
  config: AuthConfig,
) {
  const sessionCookie = config.production
    ? '__Host-drivepool_session'
    : 'drivepool_session';
  const oauthCookie = config.production
    ? '__Host-drivepool_oauth'
    : 'drivepool_oauth';
  const cookie: CookieOptions = {
    httpOnly: true,
    secure: config.production,
    sameSite: 'lax',
    path: '/',
  };
  const fail = (res: Response, status: number, code: string, message: string) =>
    res.status(status).json({ error: { code, message } });
  const callbackRedirect = (res: Response, outcome: string) => {
    const target = new URL('/', config.appOrigin);
    target.searchParams.set('auth', outcome);
    res.redirect(303, target.toString());
  };
  const readSession = (req: Request) => {
    const token: unknown = req.cookies?.[sessionCookie];
    return isToken(token) ? token : null;
  };
  async function googleSignIn(_req: Request, res: Response) {
    if (!config.clientId || !config.clientSecret) {
      fail(
        res,
        503,
        'auth_not_configured',
        'Google sign-in is not configured.',
      );
      return;
    }
    const state = randomToken();
    const browserToken = randomToken();
    const nonce = randomToken();
    const verifier = randomToken();
    await store.startOAuth({
      stateHash: hash(state),
      browserHash: hash(browserToken),
      nonce,
      verifier,
      expiresAt: new Date(Date.now() + TRANSACTION_MS),
      intent: 'login',
    });
    res.cookie(oauthCookie, browserToken, {
      ...cookie,
      maxAge: TRANSACTION_MS,
    });
    res.redirect(302, google.authorizationUrl(state, nonce, verifier));
  }

  async function googleCallback(req: Request, res: Response) {
    res.clearCookie(oauthCookie, cookie);
    const state = req.query.state;
    const browser: unknown = req.cookies?.[oauthCookie];
    if (!isToken(state) || !isToken(browser)) {
      callbackRedirect(res, 'invalid_state');
      return;
    }
    const transaction = await store.consumeOAuth(hash(state), hash(browser));
    if (!transaction) {
      callbackRedirect(res, 'invalid_state');
      return;
    }
    if (req.query.error !== undefined) {
      callbackRedirect(res, 'consent_denied');
      return;
    }
    const code = req.query.code;
    if (typeof code !== 'string' || !code || code.length > 4096) {
      callbackRedirect(res, 'invalid_code');
      return;
    }
    try {
      const identity = await google.exchange(
        code,
        transaction.verifier,
        transaction.nonce,
      );
      const token = randomToken();
      const oldToken = readSession(req);
      await store.signIn(
        identity,
        {
          tokenHash: hash(token),
          csrfToken: randomToken(),
          expiresAt: new Date(Date.now() + SESSION_MS),
        },
        oldToken ? hash(oldToken) : undefined,
      );
      res.cookie(sessionCookie, token, { ...cookie, maxAge: SESSION_MS });
      callbackRedirect(res, 'success');
    } catch (error) {
      if (!(error instanceof OAuthFailure)) throw error;
      callbackRedirect(res, error.code);
    }
  }

  async function me(req: Request, res: Response) {
    const token = readSession(req);
    const session = token ? await store.findSession(hash(token)) : null;
    if (!session) {
      res.clearCookie(sessionCookie, cookie);
      fail(res, 401, 'unauthenticated', 'Sign in to continue.');
      return;
    }
    const { id, email, name, avatarUrl, plan } = session.user;
    res.json({
      user: { id, email, name, avatarUrl, plan },
      csrfToken: session.csrfToken,
    });
  }

  async function logout(req: Request, res: Response) {
    const token = readSession(req);
    const session = token ? await store.findSession(hash(token)) : null;
    if (!token || !session) {
      fail(res, 401, 'unauthenticated', 'Sign in to continue.');
      return;
    }
    const csrf = req.get('X-CSRF-Token');
    if (
      req.get('Origin') !== config.appOrigin ||
      !csrf ||
      !equalToken(csrf, session.csrfToken)
    ) {
      fail(res, 403, 'csrf_failed', 'The request could not be verified.');
      return;
    }
    await store.logout(hash(token));
    res.clearCookie(sessionCookie, cookie);
    res.status(204).end();
  }

  return { googleSignIn, googleCallback, me, logout };
}
