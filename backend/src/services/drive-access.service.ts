import type { AuthConfig } from "../config/auth.config";
import type { DriveAccount, DriveRepository } from "../db/drive.repository";
import type { TokenEncryption } from "./token-encryption.service";
import { HttpError } from "../utils/http-error.util";

const ENDPOINTS = {
  token: "https://oauth2.googleapis.com/token",
  revoke: "https://oauth2.googleapis.com/revoke",
};
export function createDriveAccess(
  repository: DriveRepository,
  encryption: TokenEncryption,
  config: AuthConfig,
  endpoints = ENDPOINTS,
  timeoutMs = 10_000,
) {
  const tokens = new Map<
    string,
    { value: string; expiresAt: number; grant: string }
  >();
  const refreshes = new Map<string, Promise<string>>();
  const disconnectListeners = new Set<(userId: string) => void>();
  const decrypt = (account: DriveAccount) =>
    encryption.decrypt(
      account.encryptedRefreshToken,
      `${account.userId}:${account.googleSubject}`,
    );
  async function post(url: string, body: URLSearchParams) {
    try {
      return await fetch(url, {
        method: "POST",
        body,
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new HttpError(
        503,
        "provider_unavailable",
        "Google is temporarily unavailable.",
      );
    }
  }
  async function refresh(account: DriveAccount): Promise<string> {
    const response = await post(
      endpoints.token,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: await decrypt(account),
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    );
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      access_token?: string;
      expires_in?: number;
    };
    if (!response.ok) {
      if (data.error === "invalid_grant") {
        tokens.delete(account.id);
        await repository.markReconnect(account.userId, account.id);
        throw new HttpError(
          409,
          "reconnect_required",
          "Reconnect this Google Drive account.",
        );
      }
      throw new HttpError(
        503,
        "provider_unavailable",
        "Google is temporarily unavailable.",
      );
    }
    if (
      typeof data.access_token !== "string" ||
      !data.access_token ||
      typeof data.expires_in !== "number" ||
      !Number.isFinite(data.expires_in) ||
      data.expires_in <= 0
    ) {
      throw new HttpError(
        503,
        "invalid_provider_response",
        "Google returned an invalid response.",
      );
    }
    const current = await repository.get(account.userId, account.id);
    if (
      !current ||
      current.status !== "active" ||
      current.encryptedRefreshToken !== account.encryptedRefreshToken
    ) {
      throw new HttpError(
        409,
        "account_changed",
        "The connected account changed. Refresh and try again.",
      );
    }
    if (tokens.size >= 1000) tokens.delete(tokens.keys().next().value!);
    tokens.set(account.id, {
      value: data.access_token,
      expiresAt: Date.now() + Math.max(0, data.expires_in - 30) * 1000,
      grant: account.encryptedRefreshToken,
    });
    return data.access_token;
  }
  async function accessToken(userId: string, id: string): Promise<string> {
    const account = await repository.get(userId, id);
    if (!account || account.status === "disconnecting")
      throw new HttpError(404, "account_not_found", "Account not found.");
    if (account.status === "reconnect")
      throw new HttpError(
        409,
        "reconnect_required",
        "Reconnect this Google Drive account.",
      );
    const cached = tokens.get(id);
    if (
      cached &&
      cached.expiresAt > Date.now() &&
      cached.grant === account.encryptedRefreshToken
    )
      return cached.value;
    let pending = refreshes.get(id);
    if (!pending) {
      pending = refresh(account).finally(() => {
        refreshes.delete(id);
      });
      refreshes.set(id, pending);
    }
    return pending;
  }
  async function finishDisconnect(account: DriveAccount): Promise<boolean> {
    tokens.delete(account.id);
    try {
      const response = await post(
        endpoints.revoke,
        new URLSearchParams({ token: await decrypt(account) }),
      );
      const error = response.ok
        ? null
        : ((await response.json().catch(() => ({}))) as { error?: string });
      if (
        !response.ok &&
        !(response.status === 400 && error?.error === "invalid_token")
      )
        return false;
      await repository.remove(account.userId, account.id);
      return true;
    } catch {
      return false;
    }
  }
  async function disconnect(userId: string, id: string) {
    const account = await repository.beginDisconnect(userId, id);
    for (const listener of disconnectListeners) listener(userId);
    if (!account) return true;
    return finishDisconnect(account);
  }
  async function retryDisconnects() {
    for (const account of await repository.pendingDisconnects()) {
      // Bound credential retention when Google cannot be reached. Users can also revoke in Google settings.
      if (Date.now() - account.updatedAt.getTime() > 24 * 60 * 60 * 1000) {
        tokens.delete(account.id);
        await repository.remove(account.userId, account.id);
      } else await finishDisconnect(account);
    }
  }
  return {
    onDisconnect: (listener: (userId: string) => void) => {
      disconnectListeners.add(listener);
    },
    accessToken,
    disconnect,
    retryDisconnects,
    invalidate: (id: string) => {
      tokens.delete(id);
    },
  };
}
export type DriveAccess = ReturnType<typeof createDriveAccess>;
