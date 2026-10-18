export interface DriveAccount {
  id: string;
  label: string;
  email: string;
  usedGB: number;
  capacityGB: number;
  files: number;
  color: "blue" | "amber" | "violet";
}

export interface DriveFile {
  id: string;
  name: string;
  kind: "Document" | "Image" | "Spreadsheet" | "Video" | "Archive";
  accountId: string;
  sizeMB: number;
  modified: string;
}
