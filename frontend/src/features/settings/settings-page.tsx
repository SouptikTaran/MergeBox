"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { LogOut, Monitor, Moon, RefreshCw, Sun } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Frame, FrameHeader, FrameTitle, FramePanel } from "@/components/reui/frame";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/session-provider";
import { SignInButton } from "@/features/auth/sign-in-button";
import { useWorkspace } from "@/features/workspace/workspace-provider";

export function SettingsPage() {
  const { state, refresh, logout } = useSession();
  const { theme, setTheme } = useTheme();
  const { preview, setPreview } = useWorkspace();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      await logout();
      toast.success("Signed out");
    } catch {
      toast.error("Couldn’t sign out", {
        description: "Please check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader title="Settings" description="Make this space feel like yours." />
      <div className="flex max-w-3xl flex-col gap-6">
        <Frame spacing="default">
          <FrameHeader>
            <FrameTitle>Your account</FrameTitle>
          </FrameHeader>
          <FramePanel>
            {state.status === "loading" ? (
              <div className="flex flex-col gap-3" aria-label="Loading account">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-8 w-28" />
              </div>
            ) : state.status === "authenticated" ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {state.session.user.name ?? "Google account"}
                  </span>
                  <span className="break-all text-sm text-muted-foreground">
                    {state.session.user.email}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="success-light">Signed in</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void signOut()}
                  >
                    <LogOut />
                    {busy ? "Signing out…" : "Sign out"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4">
                {state.status === "error" && (
                  <div role="alert" className="flex flex-col gap-3">
                    <p className="text-sm">{state.message}</p>
                    <Button size="sm" variant="outline" onClick={() => void refresh()}>
                      <RefreshCw />
                      Retry connection
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Sign in with Google to create your personal workspace. Signing in does
                  not connect your Google Drive.
                </p>
                <SignInButton />
              </div>
            )}
          </FramePanel>
        </Frame>
        <Frame spacing="default">
          <FrameHeader>
            <FrameTitle>Appearance</FrameTitle>
          </FrameHeader>
          <FramePanel>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Choose a comfortable view for your workspace.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "System", icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    size="sm"
                    variant="outline"
                    aria-pressed={theme === value}
                    onClick={() => setTheme(value)}
                  >
                    <Icon />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </FramePanel>
        </Frame>
        <Frame spacing="default">
          <FrameHeader>
            <FrameTitle>Workspace preview</FrameTitle>
          </FrameHeader>
          <FramePanel>
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm text-muted-foreground">
                Explore the layout with sample drives and files. Preview content is
                separate from your Google account.
              </p>
              <Button size="sm" variant="outline" onClick={() => setPreview(!preview)}>
                {preview ? "Exit preview" : "Explore preview"}
              </Button>
            </div>
          </FramePanel>
        </Frame>
      </div>
    </>
  );
}
