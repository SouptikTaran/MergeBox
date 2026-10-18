import { AppShell } from "@/components/layout/app-shell";
import { RequireSession } from "@/features/auth/require-session";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSession>
      <WorkspaceProvider>
        <AppShell>{children}</AppShell>
      </WorkspaceProvider>
    </RequireSession>
  );
}
