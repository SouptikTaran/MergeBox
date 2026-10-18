import type { DriveAccount, DriveFile } from "./types";

// Deliberately isolated fixtures: no Drive API exists yet. Never mix with live data.
export const previewAccounts: DriveAccount[] = [
  {
    id: "personal",
    label: "Personal",
    email: "alex.morgan@example.com",
    usedGB: 24.8,
    capacityGB: 100,
    files: 1248,
    color: "blue",
  },
  {
    id: "studio",
    label: "Studio",
    email: "alex.studio@example.com",
    usedGB: 38.2,
    capacityGB: 100,
    files: 862,
    color: "violet",
  },
  {
    id: "archive",
    label: "Archive",
    email: "alex.archive@example.com",
    usedGB: 12.4,
    capacityGB: 15,
    files: 326,
    color: "amber",
  },
];

export const previewFiles: DriveFile[] = [
  {
    id: "1",
    name: "Brand guidelines.pdf",
    kind: "Document",
    accountId: "studio",
    sizeMB: 4.8,
    modified: "2026-10-18",
  },
  {
    id: "2",
    name: "Autumn collection.jpg",
    kind: "Image",
    accountId: "studio",
    sizeMB: 12.6,
    modified: "2026-10-18",
  },
  {
    id: "3",
    name: "Q4 planning.xlsx",
    kind: "Spreadsheet",
    accountId: "personal",
    sizeMB: 1.2,
    modified: "2026-10-17",
  },
  {
    id: "4",
    name: "Product walkthrough.mp4",
    kind: "Video",
    accountId: "studio",
    sizeMB: 248,
    modified: "2026-10-16",
  },
  {
    id: "5",
    name: "Project handoff.zip",
    kind: "Archive",
    accountId: "archive",
    sizeMB: 86.4,
    modified: "2026-10-15",
  },
  {
    id: "6",
    name: "Weekend in Copenhagen.jpg",
    kind: "Image",
    accountId: "personal",
    sizeMB: 8.3,
    modified: "2026-10-14",
  },
  {
    id: "7",
    name: "Research notes.pdf",
    kind: "Document",
    accountId: "personal",
    sizeMB: 2.1,
    modified: "2026-10-13",
  },
  {
    id: "8",
    name: "2025 studio backup.zip",
    kind: "Archive",
    accountId: "archive",
    sizeMB: 512,
    modified: "2026-10-11",
  },
];

export const accountColors = {
  blue: "bg-blue-500 dark:bg-blue-400",
  violet: "bg-violet-500 dark:bg-violet-400",
  amber: "bg-amber-500 dark:bg-amber-400",
} as const;
