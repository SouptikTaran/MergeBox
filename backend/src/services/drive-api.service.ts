import type { DriveRepository } from '../db/drive.repository';
import type { DriveAccess } from './drive-access.service';
import { HttpError } from '../utils/http-error.util';

export function createDriveApi(
  access: DriveAccess,
  repository: DriveRepository,
  baseUrl = 'https://www.googleapis.com/drive/v3',
  timeoutMs = 10_000,
) {
  async function get(
    userId: string,
    accountId: string,
    path: 'about' | 'files',
    params: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const url = new URL(`${baseUrl}/${path}`);
    url.search = new URLSearchParams(params).toString();
    let refreshed = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const token = await access.accessToken(userId, accountId);
      let response: Response;
      try {
        response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          redirect: 'error',
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw new HttpError(
          503,
          'provider_unavailable',
          'Google Drive is temporarily unavailable.',
        );
      }
      const data = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (
        response.ok &&
        data &&
        typeof data === 'object' &&
        !Array.isArray(data)
      ) {
        const current = await repository.get(userId, accountId);
        if (!current || current.status !== 'active')
          throw new HttpError(
            409,
            'account_changed',
            'The connected account changed.',
          );
        return data;
      }
      if (response.status === 401 && !refreshed) {
        access.invalidate(accountId);
        refreshed = true;
        continue;
      }
      const reason = (
        data?.error as { errors?: { reason?: string }[] } | undefined
      )?.errors?.[0]?.reason;
      if (
        response.status === 401 ||
        (response.status === 403 && reason === 'insufficientPermissions')
      ) {
        await repository.markReconnect(userId, accountId);
        throw new HttpError(
          409,
          'reconnect_required',
          'Reconnect this Google Drive account.',
        );
      }
      if (
        attempt < 2 &&
        (response.status === 429 ||
          response.status >= 500 ||
          reason === 'userRateLimitExceeded' ||
          reason === 'rateLimitExceeded')
      ) {
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            200 * 2 ** attempt + Math.floor(Math.random() * 100),
          ),
        );
        continue;
      }
      throw new HttpError(
        503,
        response.status === 429
          ? 'provider_rate_limited'
          : 'provider_unavailable',
        'Google Drive could not complete the request.',
      );
    }
    throw new HttpError(
      503,
      'provider_unavailable',
      'Google Drive could not complete the request.',
    );
  }
  return { get };
}
export type DriveApi = ReturnType<typeof createDriveApi>;
