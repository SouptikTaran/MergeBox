"use client";
import { Fragment, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session-provider";
import { Button } from "@/components/ui/button";
export function RequireSession({ children }: { children: React.ReactNode }) {
  const { state, refresh } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (state.status === "anonymous") router.replace("/login" + window.location.search);
  }, [state.status, router]);
  if (state.status === "authenticated")
    return <Fragment key={state.session.user.id}>{children}</Fragment>;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      {state.status === "error" ? (
        <>
          <p role="alert">{state.message}</p>
          <Button onClick={() => void refresh()}>Retry connection</Button>
        </>
      ) : (
        <p role="status">Checking your session…</p>
      )}
    </main>
  );
}
