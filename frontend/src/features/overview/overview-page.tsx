"use client";
import { PageHeader } from "@/components/layout/page-header";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { ConnectDriveButton } from "@/features/drives/connect-drive-button";
import { DriveCard } from "@/features/drives/drive-card";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { formatBytes } from "@/features/workspace/api-types";
import { EmptyWorkspace } from "@/features/workspace/empty-workspace";
import { AuthOutcome } from "@/features/auth/auth-outcome";
export function OverviewPage() {
  const { accounts, storage, loading, error } = useWorkspace();
  return (
    <>
      <AuthOutcome />
      <PageHeader
        title="Your space, in one place."
        description="Live storage across your connected Google accounts."
        action={<ConnectDriveButton />}
      />
      {!accounts.length ? (
        !loading && !error && <EmptyWorkspace />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Storage used", storage?.combined.used],
              ["Total personal storage", storage?.combined.total],
              ["Available storage", storage?.combined.free],
            ].map(([label, value]) => (
              <Frame key={label}>
                <FrameHeader>
                  <FrameTitle>{label}</FrameTitle>
                </FrameHeader>
                <FramePanel>
                  <p className="text-2xl font-semibold tabular-nums">
                    {value === undefined ? "Not available" : formatBytes(value)}
                  </p>
                </FramePanel>
              </Frame>
            ))}
          </div>
          {storage && !storage.combined.complete && (
            <p role="status" className="text-sm text-muted-foreground">
              Combined totals exclude accounts with shared, unknown, or unavailable
              capacity. See each drive below for details.
            </p>
          )}
          <h2 className="text-sm font-semibold">Your drives ({accounts.length})</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => (
              <DriveCard key={account.id} account={account} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
