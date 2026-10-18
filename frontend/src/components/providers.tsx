"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/features/auth/session-provider";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <SessionProvider>
          <WorkspaceProvider>{children}</WorkspaceProvider>
        </SessionProvider>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
