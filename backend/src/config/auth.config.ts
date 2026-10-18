import './env';

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  appOrigin: string;
  apiOrigin: string;
  production: boolean;
}

function origin(value: string, production: boolean): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('APP_ORIGIN and API_ORIGIN must be valid origins.');
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        !production &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      ))
  ) {
    throw new Error(
      'Origins must use HTTPS (HTTP is allowed only on localhost in development) and contain no path.',
    );
  }
  return url.origin;
}

export function readAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfig {
  const production = env.NODE_ENV === 'production';
  if (production && (!env.APP_ORIGIN || !env.API_ORIGIN))
    throw new Error('Set APP_ORIGIN and API_ORIGIN in production.');
  const clientId = env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  if (production && (!clientId || !clientSecret))
    throw new Error('Google OAuth credentials are required in production.');
  return {
    clientId,
    clientSecret,
    production,
    appOrigin: origin(env.APP_ORIGIN || 'http://localhost:3000', production),
    apiOrigin: origin(env.API_ORIGIN || 'http://localhost:8000', production),
  };
}
