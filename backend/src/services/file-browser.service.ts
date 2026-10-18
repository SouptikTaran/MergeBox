import type { DriveApi } from './drive-api.service';
import type { DriveAccount, DriveRepository } from '../db/drive.repository';
import { mapConcurrent } from '../utils/async.util';
import { randomToken } from '../utils/auth.util';
import { HttpError } from '../utils/http-error.util';

export interface BrowseOptions { accountId?: string; sort: 'name' | 'modifiedTime' | 'size' | 'mimeType'; direction: 'asc' | 'desc'; pageSize: number; pageToken?: string }
interface FileItem { id: string; name: string; mimeType: string; size: string | null; modifiedTime: string | null; webViewLink: string | null; accountId: string; accountEmail: string }
interface Snapshot { userId: string; signature: string; query: string; files: FileItem[]; errors: { accountId: string; code: string }[]; expiresAt: number; fetchedAt: string }

function fileItem(value: unknown, account: DriveAccount): FileItem {
  const file = value as Record<string, unknown>;
  if (!file || typeof file.id !== 'string' || typeof file.name !== 'string' || typeof file.mimeType !== 'string') throw new HttpError(503, 'invalid_file_metadata', 'Google returned invalid file metadata.');
  let webViewLink: string | null = null;
  if (typeof file.webViewLink === 'string') {
    try {
      const url = new URL(file.webViewLink);
      if (url.protocol === 'https:' && !url.username && !url.password && ['drive.google.com', 'docs.google.com'].includes(url.hostname)) webViewLink = url.toString();
    } catch { /* Invalid provider links are not exposed. */ }
  }
  return { id: file.id, name: file.name, mimeType: file.mimeType, size: typeof file.size === 'string' && /^\d+$/.test(file.size) ? file.size : null, modifiedTime: typeof file.modifiedTime === 'string' && Number.isFinite(Date.parse(file.modifiedTime)) ? file.modifiedTime : null, webViewLink, accountId: account.id, accountEmail: account.email };
}

export function createFileBrowser(repository: DriveRepository, api: DriveApi, settings = { ttlMs: 300_000, maxFiles: 100_000, maxSnapshots: 5, scanTimeoutMs: 120_000 }) {
  const snapshots = new Map<string, Snapshot>();
  const inFlight = new Set<string>();
  const generations = new Map<string, number>();
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  const signature = (accounts: DriveAccount[]) => accounts.map((a) => `${a.id}:${a.status}:${a.updatedAt.toISOString()}`).sort().join('|');
  function clear(userId: string) {
    generations.set(userId, (generations.get(userId) ?? 0) + 1);
    for (const [id, snapshot] of snapshots) if (snapshot.userId === userId) snapshots.delete(id);
  }
  function cleanup() {
    for (const [id, snapshot] of snapshots) if (snapshot.expiresAt <= Date.now()) snapshots.delete(id);
    for (const userId of generations.keys()) if (!inFlight.has(userId) && ![...snapshots.values()].some((s) => s.userId === userId)) generations.delete(userId);
  }
  async function list(userId: string, options: BrowseOptions) {
    cleanup();
    const accounts = (await repository.list(userId)).filter((a) => a.status !== 'disconnecting');
    const selected = options.accountId ? accounts.filter((a) => a.id === options.accountId) : accounts;
    if (options.accountId && !selected.length) throw new HttpError(404, 'account_not_found', 'Account not found.');
    const query = JSON.stringify({ accountId: options.accountId, sort: options.sort, direction: options.direction, pageSize: options.pageSize });
    let id: string, offset = 0, snapshot: Snapshot;
    if (options.pageToken) {
      const match = /^([A-Za-z0-9_-]{43})\.(\d+)$/.exec(options.pageToken);
      if (!match) throw new HttpError(400, 'invalid_cursor', 'Invalid file-list cursor.');
      id = match[1]!; offset = Number(match[2]);
      const cached = snapshots.get(id);
      if (!cached || cached.userId !== userId) throw new HttpError(410, 'cursor_expired', 'Refresh the file list to continue.');
      if (cached.query !== query || cached.signature !== signature(accounts)) { snapshots.delete(id); throw new HttpError(409, 'list_changed', 'The account selection changed. Refresh the file list.'); }
      if (!Number.isSafeInteger(offset) || offset > cached.files.length) throw new HttpError(400, 'invalid_cursor', 'Invalid file-list cursor.');
      snapshot = cached;
    } else {
      if (inFlight.has(userId) || inFlight.size >= 3) throw new HttpError(429, 'browse_in_progress', 'A file listing is already in progress. Try again shortly.');
      inFlight.add(userId);
      const generation = generations.get(userId) ?? 0;
      try {
        const deadline = Date.now() + settings.scanTimeoutMs;
        let total = 0;
        const results = await mapConcurrent(selected, 3, async (account) => {
          const files: FileItem[] = [], seen = new Set<string>(), pages = new Set<string>();
          let pageToken: string | undefined;
          try {
            do {
              if (Date.now() > deadline) throw new HttpError(503, 'browse_timeout', 'The file listing took too long.');
              const data = await api.get(userId, account.id, 'files', { q: "'me' in owners and trashed = false", spaces: 'drive', corpora: 'user', pageSize: '1000', fields: 'nextPageToken,incompleteSearch,files(id,name,mimeType,size,modifiedTime,webViewLink)', ...(pageToken ? { pageToken } : {}) });
              if (data.incompleteSearch === true) throw new HttpError(503, 'incomplete_listing', 'Google returned an incomplete file list.');
              if (!Array.isArray(data.files)) throw new HttpError(503, 'invalid_file_metadata', 'Google returned invalid file metadata.');
              for (const value of data.files) {
                const file = fileItem(value, account);
                if (seen.has(file.id)) continue;
                if (++total > settings.maxFiles) throw new HttpError(413, 'browse_limit', 'Filter by account to browse a smaller library.');
                seen.add(file.id); files.push(file);
              }
              if (data.nextPageToken !== undefined && (typeof data.nextPageToken !== 'string' || !data.nextPageToken)) throw new HttpError(503, 'invalid_cursor', 'Google returned an invalid cursor.');
              pageToken = data.nextPageToken as string | undefined;
              if (pageToken && pages.has(pageToken)) throw new HttpError(503, 'invalid_cursor', 'Google repeated a page cursor.');
              if (pageToken) pages.add(pageToken);
            } while (pageToken);
            return { files, error: null };
          } catch (error) { return { files: [] as FileItem[], error: { accountId: account.id, code: error instanceof HttpError ? error.code : 'service_unavailable' } }; }
        });
        const current = (await repository.list(userId)).filter((a) => a.status !== 'disconnecting');
        if (generation !== (generations.get(userId) ?? 0) || signature(current) !== signature(accounts)) throw new HttpError(409, 'list_changed', 'Connected accounts changed. Refresh the file list.');
        const files = results.flatMap((r) => r.files);
        files.sort((a, b) => {
          let comparison: number;
          if (options.sort === 'size') {
            if (a.size === null || b.size === null) return a.size === b.size ? a.accountId.localeCompare(b.accountId) || a.id.localeCompare(b.id) : a.size === null ? 1 : -1;
            comparison = BigInt(a.size) < BigInt(b.size) ? -1 : BigInt(a.size) > BigInt(b.size) ? 1 : 0;
          } else if (options.sort === 'modifiedTime') comparison = (a.modifiedTime ? Date.parse(a.modifiedTime) : 0) - (b.modifiedTime ? Date.parse(b.modifiedTime) : 0);
          else comparison = collator.compare(a[options.sort], b[options.sort]);
          return comparison * (options.direction === 'asc' ? 1 : -1) || a.accountId.localeCompare(b.accountId) || a.id.localeCompare(b.id);
        });
        id = randomToken();
        snapshot = { userId, signature: signature(accounts), query, files, errors: results.flatMap((r) => r.error ? [r.error] : []), expiresAt: Date.now() + settings.ttlMs, fetchedAt: new Date().toISOString() };
        for (const [key, old] of snapshots) if (old.userId === userId) snapshots.delete(key);
        if (snapshots.size >= settings.maxSnapshots) snapshots.delete(snapshots.keys().next().value!);
        snapshots.set(id, snapshot);
      } finally { inFlight.delete(userId); }
    }
    const next = offset + options.pageSize;
    return { files: snapshot.files.slice(offset, next), total: snapshot.files.length, nextPageToken: next < snapshot.files.length ? `${id}.${next}` : null, partial: snapshot.errors.length > 0, errors: snapshot.errors, fetchedAt: snapshot.fetchedAt };
  }
  return { list, clear, cleanup };
}
export type FileBrowser = ReturnType<typeof createFileBrowser>;
