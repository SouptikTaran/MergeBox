"use client";
import { useState } from "react";
import { Frame, FrameHeader, FrameTitle, FramePanel } from "@/components/reui/frame";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { formatBytes, type FileItem } from "@/features/workspace/api-types";

export function FileGrid({ files }: { files: FileItem[] }) {
  const [selected, setSelected] = useState<FileItem | null>(null);
  return (
    <>
      <Frame className="min-w-0">
        <FrameHeader>
          <FrameTitle>File library</FrameTitle>
        </FrameHeader>
        <FramePanel className="overflow-x-auto p-0">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {["File name", "Type", "Account", "Size", "Modified"].map((label) => (
                  <th key={label} className="p-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={`${file.accountId}:${file.id}`}
                  className="border-b last:border-0"
                >
                  <td className="max-w-80 break-words p-3">
                    <button
                      className="text-left font-medium hover:underline"
                      onClick={() => setSelected(file)}
                    >
                      {file.name}
                    </button>
                  </td>
                  <td className="max-w-48 break-words p-3 text-xs text-muted-foreground">
                    {file.mimeType}
                  </td>
                  <td className="max-w-60 break-words p-3">{file.accountEmail}</td>
                  <td className="whitespace-nowrap p-3 tabular-nums">
                    {formatBytes(file.size)}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {file.modifiedTime
                      ? new Date(file.modifiedTime).toLocaleDateString()
                      : "Not available"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!files.length && (
            <p className="p-8 text-sm text-muted-foreground">
              No files in this selection.
            </p>
          )}
        </FramePanel>
      </Frame>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="break-all">{selected?.name}</DialogTitle>
            <DialogDescription>File details from Google Drive</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-3 text-sm">
              <p className="break-all">Account: {selected.accountEmail}</p>
              <p>Size: {formatBytes(selected.size)}</p>
              <p className="break-all">Type: {selected.mimeType}</p>
              {selected.webViewLink ? (
                <a
                  className={buttonVariants()}
                  href={selected.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Google Drive
                </a>
              ) : (
                <p>Google did not provide an open link for this file.</p>
              )}
            </div>
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
