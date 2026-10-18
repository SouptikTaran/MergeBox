export interface Account {
  id: string;
  email: string;
  status: "active" | "reconnect" | "disconnecting";
}
export interface Quota {
  used: string;
  total: string | null;
  free: string | null;
  driveUsed: string;
  trashUsed: string;
  capacityKind: "personal" | "unlimited" | "unverified";
  includedInTotal: boolean;
}
export interface StorageOverview {
  accounts: (Account & { quota: Quota | null; error: string | null })[];
  combined: {
    used: string | null;
    total: string | null;
    free: string | null;
    complete: boolean;
    excludedAccountIds: string[];
  };
  partial: boolean;
}
export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size: string | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  accountId: string;
  accountEmail: string;
}
export interface FilePage {
  files: FileItem[];
  total: number;
  nextPageToken: string | null;
  partial: boolean;
  errors: { accountId: string; code: string }[];
  fetchedAt: string;
}
export function formatBytes(value: string | null | undefined) {
  if (value == null) return "Not available";
  const bytes = Number(value);
  if (bytes < 1000) return `${bytes} B`;
  const unit = Math.min(Math.floor(Math.log10(bytes) / 3), 4);
  return `${(bytes / 1000 ** unit).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${["B", "KB", "MB", "GB", "TB"][unit]}`;
}
