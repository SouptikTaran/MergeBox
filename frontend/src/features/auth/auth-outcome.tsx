"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "./session-provider";

const messages: Record<string, string> = {
  success: "Google sign-in completed. Drive access requires a separate connection.",
  consent_denied: "Sign-in was cancelled. You can try again whenever you’re ready.",
  invalid_state: "This sign-in link expired. Please start again.",
  invalid_code: "Google sign-in could not be completed. Please try again.",
  invalid_identity: "We couldn’t verify this Google account. Please try again.",
  provider_unavailable: "Google is temporarily unavailable. Please try again shortly.",
};

export function AuthOutcome() {
  const [outcome, setOutcome] = useState<string | null>(null);
  const { state } = useSession();
  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("auth");
    if (result) {
      // Capture a one-time external OAuth redirect before removing it from the URL.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOutcome(result);
      url.searchParams.delete("auth");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);
  if (!outcome) return null;
  const success = outcome === "success" && state.status === "authenticated";
  const message =
    outcome === "success" && !success
      ? "Verifying your session. Check Settings if your account does not appear."
      : (messages[outcome] ?? "Sign-in could not be completed. Please try again.");
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 text-sm">
      <Badge variant={success ? "success-light" : "warning-light"}>
        {success ? "Signed in" : "Sign-in notice"}
      </Badge>
      <span>{message}</span>
      <Button size="sm" variant="ghost" onClick={() => setOutcome(null)}>
        Dismiss
      </Button>
    </div>
  );
}
