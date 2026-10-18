import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AuthConfig } from '../config/auth.config';
import { challenge } from '../utils/auth.util';
import type { GoogleIdentity } from '../db/auth.repository';

export class OAuthFailure extends Error {
  constructor(
    public readonly code:
      'provider_unavailable' | 'invalid_identity' | 'invalid_code',
  ) {
    super(code);
  }
}

const GOOGLE = {
  authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  jwks: 'https://www.googleapis.com/oauth2/v3/certs',
};

// Endpoint injection is for the local HTTP simulator, never read from user requests.
export function createGoogleProvider(
  config: AuthConfig,
  endpoints = GOOGLE,
  timeoutMs = 10_000,
) {
  const keys = createRemoteJWKSet(new URL(endpoints.jwks), {
    timeoutDuration: timeoutMs,
  });
  const redirectUri = `${config.apiOrigin}/api/auth/google/callback`;
  return {
    authorizationUrl(state: string, nonce: string, verifier: string) {
      const url = new URL(endpoints.authorize);
      url.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce,
        code_challenge: challenge(verifier),
        code_challenge_method: 'S256',
        prompt: 'select_account',
        access_type: 'online',
      }).toString();
      return url.toString();
    },
    async exchange(
      code: string,
      verifier: string,
      nonce: string,
    ): Promise<GoogleIdentity> {
      let response: Response;
      try {
        response = await fetch(endpoints.token, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            code_verifier: verifier,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });
      } catch {
        throw new OAuthFailure('provider_unavailable');
      }
      if (response.status === 429 || response.status >= 500)
        throw new OAuthFailure('provider_unavailable');
      if (!response.ok) throw new OAuthFailure('invalid_code');
      let token: unknown;
      try {
        token = ((await response.json()) as { id_token?: unknown }).id_token;
      } catch {
        throw new OAuthFailure('invalid_identity');
      }
      if (typeof token !== 'string') throw new OAuthFailure('invalid_identity');
      try {
        const { payload } = await jwtVerify(token, keys, {
          issuer: ['https://accounts.google.com', 'accounts.google.com'],
          audience: config.clientId,
          algorithms: ['RS256'],
          requiredClaims: [
            'sub',
            'exp',
            'iat',
            'nonce',
            'email',
            'email_verified',
          ],
          maxTokenAge: '1 hour',
          clockTolerance: 5,
        });
        if (
          payload.nonce !== nonce ||
          payload.email_verified !== true ||
          typeof payload.email !== 'string' ||
          !payload.email ||
          !payload.sub ||
          payload.sub.length > 255 ||
          (payload.azp !== undefined && payload.azp !== config.clientId) ||
          (Array.isArray(payload.aud) &&
            payload.aud.length > 1 &&
            payload.azp !== config.clientId)
        ) {
          throw new OAuthFailure('invalid_identity');
        }
        return {
          subject: payload.sub,
          email: payload.email,
          name: typeof payload.name === 'string' ? payload.name : null,
          avatarUrl:
            typeof payload.picture === 'string' &&
            payload.picture.startsWith('https://')
              ? payload.picture
              : null,
        };
      } catch (error) {
        if (error instanceof OAuthFailure) throw error;
        const code = (error as { code?: string }).code;
        if (
          code === 'ERR_JWKS_TIMEOUT' ||
          error instanceof TypeError ||
          code === 'ERR_JOSE_GENERIC'
        ) {
          throw new OAuthFailure('provider_unavailable');
        }
        throw new OAuthFailure('invalid_identity');
      }
    },
  };
}

export type GoogleProvider = ReturnType<typeof createGoogleProvider>;
