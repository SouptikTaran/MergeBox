"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session-provider";
import { apiRequest } from "@/lib/api/client";
export function ConnectDriveButton({ accountId }: { accountId?: string }) {
  const { state } = useSession();
  const [busy, setBusy] = useState(false);
  async function connect() {
    if (state.status !== "authenticated") return;
    setBusy(true);
    try {
      const data = await apiRequest<{ authorizationUrl: string }>(
        accountId
          ? `/api/drive/accounts/${accountId}/reconnect`
          : "/api/drive/accounts/connect",
        { method: "POST", headers: { "X-CSRF-Token": state.session.csrfToken } },
      );
      const url = new URL(data.authorizationUrl);
      if (url.origin !== "https://accounts.google.com")
        throw new Error("Unexpected authorization destination.");
      window.location.assign(url.toString());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not connect your drive.",
      );
      setBusy(false);
    }
  }
  return (
    <Button size="sm" disabled={busy} onClick={() => void connect()}>
      <Plus />
      {busy ? "Connecting..." : accountId ? "Reconnect" : "Connect drive"}
    </Button>
  );
}
