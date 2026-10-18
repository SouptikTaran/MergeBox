import type { DriveRepository } from '../db/drive.repository';
import type { DriveApi } from './drive-api.service';
import { mapConcurrent } from '../utils/async.util';
import { HttpError } from '../utils/http-error.util';

function bytes(value: unknown): bigint {
  if (typeof value !== 'string' || !/^\d+$/.test(value))
    throw new HttpError(
      503,
      'invalid_quota',
      'Google returned invalid storage information.',
    );
  return BigInt(value);
}
export function createStorageService(
  repository: DriveRepository,
  api: DriveApi,
) {
  async function overview(userId: string) {
    const connected = (await repository.list(userId)).filter(
      (account) => account.status !== 'disconnecting',
    );
    const accounts = await mapConcurrent(connected, 3, async (account) => {
      try {
        const data = await api.get(userId, account.id, 'about', {
          fields: 'storageQuota',
        });
        const quota = data.storageQuota as Record<string, unknown> | undefined;
        if (!quota)
          throw new HttpError(
            503,
            'invalid_quota',
            'Google returned no storage information.',
          );
        const used = bytes(quota.usage),
          driveUsed = bytes(quota.usageInDrive),
          trashUsed = bytes(quota.usageInDriveTrash);
        const total = quota.limit === undefined ? null : bytes(quota.limit);
        const capacityKind =
          total === null
            ? 'unlimited'
            : /@(gmail\.com|googlemail\.com)$/i.test(account.email)
              ? 'personal'
              : 'unverified';
        const free = total === null ? null : total > used ? total - used : 0n;
        return {
          id: account.id,
          email: account.email,
          status: 'active',
          quota: {
            used: used.toString(),
            total: total?.toString() ?? null,
            free: free?.toString() ?? null,
            driveUsed: driveUsed.toString(),
            trashUsed: trashUsed.toString(),
            capacityKind,
            includedInTotal: capacityKind === 'personal',
          },
          error: null,
          fetchedAt: new Date().toISOString(),
        };
      } catch (error) {
        const code =
          error instanceof HttpError ? error.code : 'service_unavailable';
        return {
          id: account.id,
          email: account.email,
          status: code === 'reconnect_required' ? 'reconnect' : account.status,
          quota: null,
          error: code,
          fetchedAt: null,
        };
      }
    });
    let used = 0n,
      total = 0n,
      free = 0n;
    const excludedAccountIds: string[] = [];
    for (const account of accounts) {
      if (account.quota?.includedInTotal) {
        used += BigInt(account.quota.used);
        total += BigInt(account.quota.total!);
        free += BigInt(account.quota.free!);
      } else excludedAccountIds.push(account.id);
    }
    return {
      accounts,
      combined: {
        used: used.toString(),
        total: total.toString(),
        free: free.toString(),
        excludedAccountIds,
        complete: excludedAccountIds.length === 0,
      },
      partial: accounts.some((account) => account.error !== null),
    };
  }
  return { overview };
}
export type StorageService = ReturnType<typeof createStorageService>;
