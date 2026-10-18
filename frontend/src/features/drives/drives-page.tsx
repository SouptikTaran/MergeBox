"use client";

import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Frame, FrameHeader, FrameTitle, FramePanel } from "@/components/reui/frame";
import { previewAccounts } from "@/features/workspace/preview-data";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { EmptyWorkspace } from "@/features/workspace/empty-workspace";
import { DriveCard } from "./drive-card";
import { ConnectDriveButton } from "./connect-drive-button";

export function DrivesPage() {
  const { preview } = useWorkspace();
  return (
    <>
      <PageHeader
        title="Connected drives"
        description="A home for every part of your digital life."
        action={<ConnectDriveButton />}
      />
      {preview ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {previewAccounts.map((account) => (
            <DriveCard account={account} key={account.id} />
          ))}
        </div>
      ) : (
        <EmptyWorkspace />
      )}
      <Frame spacing="default">
        <FrameHeader>
          <FrameTitle>Your files stay yours</FrameTitle>
        </FrameHeader>
        <FramePanel>
          <div className="flex items-start gap-3">
            <ShieldCheck className="size-5 shrink-0 text-muted-foreground" />
            <div className="flex max-w-2xl flex-col gap-2 text-sm text-muted-foreground">
              <p>
                DrivePool is designed to show your Google Drive accounts together. Your
                files stay in their original accounts.
              </p>
              <p>
                These are sample personal accounts with independent quotas. Shared
                organization storage and unknown limits will be identified separately when
                live connections are available.
              </p>
            </div>
          </div>
        </FramePanel>
      </Frame>
    </>
  );
}
