"use client";
import { PageHeader } from "@/components/layout/page-header";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { EmptyWorkspace } from "@/features/workspace/empty-workspace";
import { DriveCard } from "./drive-card";
import { ConnectDriveButton } from "./connect-drive-button";
export function DrivesPage() {
  const { accounts, loading, error } = useWorkspace();
  return (
    <>
      <PageHeader
        title="Connected drives"
        description="Manage access to your Google Drive accounts."
        action={<ConnectDriveButton />}
      />
      {accounts.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <DriveCard key={account.id} account={account} />
          ))}
        </div>
      ) : (
        !loading && !error && <EmptyWorkspace />
      )}
      <p className="text-sm text-muted-foreground">
        Your files stay in Google Drive. Disconnecting revokes DrivePool access without
        deleting your original files.
      </p>
    </>
  );
}
