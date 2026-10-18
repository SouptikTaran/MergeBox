"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { HardDrive } from "lucide-react";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSession } from "@/features/auth/session-provider";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { formatBytes, type Account } from "@/features/workspace/api-types";
import { apiRequest } from "@/lib/api/client";
import { ConnectDriveButton } from "./connect-drive-button";
export function DriveCard({ account }: { account: Account }) {
  const { storage, refresh } = useWorkspace();
  const { state } = useSession();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const detail = storage?.accounts.find((a) => a.id === account.id);
  const quota = detail?.quota;
  const percentage =
    quota?.total && Number(quota.total) > 0
      ? Math.min(100, (Number(quota.used) / Number(quota.total)) * 100)
      : 0;
  const status = detail?.status ?? account.status;
  async function disconnect() {
    if (state.status !== "authenticated") return;
    setBusy(true);
    try {
      const result = await apiRequest<{ message: string } | undefined>(
        `/api/drive/accounts/${account.id}`,
        { method: "DELETE", headers: { "X-CSRF-Token": state.session.csrfToken } },
      );
      setConfirm(false);
      toast.success(
        result?.message ?? "Drive disconnected. Your original files are unchanged.",
      );
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect drive.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Frame id={account.id}>
        <FramePanel>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <HardDrive className="size-5" />
              <Badge variant={status === "active" ? "outline" : "warning-light"}>
                {status === "reconnect"
                  ? "Reconnect required"
                  : status === "disconnecting"
                    ? "Disconnect pending"
                    : detail?.error
                      ? "Storage unavailable"
                      : "Connected"}
              </Badge>
            </div>
            <h3 className="break-all text-sm font-semibold">{account.email}</h3>
            {quota ? (
              <>
                <p className="text-sm">
                  {formatBytes(quota.used)} of{" "}
                  {quota.total === null ? "no reported limit" : formatBytes(quota.total)}
                </p>
                <Progress
                  value={percentage}
                  aria-label={`${account.email} storage usage`}
                />
                <p className="text-xs text-muted-foreground">
                  {quota.free === null
                    ? "Google does not report a storage limit."
                    : `${formatBytes(quota.free)} available`}
                  {!quota.includedInTotal && " Excluded from combined personal storage."}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {detail?.error === "drive_api_disabled"
                  ? "Google Drive API is disabled for this app. Enable it in the Cloud project used by the OAuth client, then refresh. No reconnection is needed."
                  : detail?.error
                    ? "Storage could not be loaded. Reconnect if access has expired, or refresh to try again."
                    : status === "disconnecting"
                      ? "Local access is disabled while Google revocation is retried."
                      : "Loading storage..."}
              </p>
            )}
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {status === "reconnect" ? (
                <ConnectDriveButton accountId={account.id} />
              ) : (
                status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/files?accountId=${account.id}`} />}
                  >
                    Browse
                  </Button>
                )
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirm(true)}
              >
                {status === "disconnecting" ? "Retry disconnect" : "Disconnect"}
              </Button>
            </div>
          </div>
        </FramePanel>
      </Frame>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect this drive?</DialogTitle>
            <DialogDescription>
              Remove {account.email} from DrivePool and revoke access. Your files stay in
              Google Drive.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void disconnect()}>
              {busy ? "Disconnecting..." : "Confirm disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
