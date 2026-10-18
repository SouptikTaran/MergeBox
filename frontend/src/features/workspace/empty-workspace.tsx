"use client";
import { Frame, FramePanel } from "@/components/reui/frame";
import { ConnectDriveButton } from "@/features/drives/connect-drive-button";
export function EmptyWorkspace() {
  return (
    <Frame>
      <FramePanel>
        <div className="flex flex-col items-start gap-4 py-8">
          <h2 className="font-semibold">A fresh start for your files</h2>
          <p className="text-sm text-muted-foreground">
            Connect a Google Drive account to see its storage and files. Sign-in alone
            does not grant Drive access.
          </p>
          <ConnectDriveButton />
        </div>
      </FramePanel>
    </Frame>
  );
}
