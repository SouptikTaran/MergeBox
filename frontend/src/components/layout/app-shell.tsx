"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronRight,
  CircleHelp,
  Files,
  HardDrive,
  LayoutDashboard,
  Moon,
  Settings2,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession } from "@/features/auth/session-provider";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { formatBytes } from "@/features/workspace/api-types";

const navigation = [
  { href: "/", title: "Overview", icon: LayoutDashboard },
  { href: "/files", title: "All files", icon: Files },
  { href: "/drives", title: "Connected drives", icon: HardDrive },
];

function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSession();
  const { accounts, storage } = useWorkspace();
  const combined = storage?.combined;
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };
  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/"
          onClick={closeMobile}
          className="flex items-center gap-2 p-3"
          aria-label="DrivePool overview"
        >
          <Boxes className="size-7 text-primary" strokeWidth={1.7} />
          <span className="text-xl font-semibold tracking-tight">
            DrivePool<span className="text-primary">.</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>WORKSPACE</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map(({ href, title, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    render={<Link href={href} onClick={closeMobile} />}
                    aria-current={pathname === href ? "page" : undefined}
                  >
                    <Icon />
                    <span>{title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>YOUR DRIVES</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accounts.length ? (
                accounts.map((account) => (
                  <SidebarMenuItem key={account.id}>
                    <SidebarMenuButton
                      render={
                        <Link href={`/drives#${account.id}`} onClick={closeMobile} />
                      }
                    >
                      <HardDrive />
                      <span>{account.email}</span>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {account.status === "reconnect" ? "Reconnect" : ""}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <li className="p-2 text-xs text-muted-foreground">No drives connected</li>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/settings"}
                render={<Link href="/settings" onClick={closeMobile} />}
                aria-current={pathname === "/settings" ? "page" : undefined}
              >
                <Settings2 />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/help" onClick={closeMobile} />}
                isActive={pathname === "/help"}
                aria-current={pathname === "/help" ? "page" : undefined}
              >
                <CircleHelp />
                <span>Help & getting started</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Pooled storage</span>
            <span className="text-muted-foreground">
              {combined?.free != null
                ? `${formatBytes(combined.free)} free`
                : "Storage unavailable"}
            </span>
          </div>
          <Progress
            value={
              combined && Number(combined.total) > 0
                ? Math.min(100, (Number(combined.used) / Number(combined.total)) * 100)
                : 0
            }
            aria-label="Combined personal storage usage"
          />
          <p className="text-xs text-muted-foreground tabular-nums">
            {combined?.total != null
              ? `${formatBytes(combined.used)} of ${formatBytes(combined.total)}`
              : accounts.length
                ? "Storage could not be loaded"
                : "Connect a drive to see your storage"}
          </p>
        </div>
        <SidebarSeparator />
        <Link
          href="/settings"
          onClick={closeMobile}
          className="flex min-w-0 items-center gap-3 p-3"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {state.session?.user.name?.slice(0, 2).toUpperCase() ?? "DP"}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {state.status === "loading" ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="truncate text-sm font-medium">
                {state.session?.user.name ?? "Your workspace"}
              </span>
            )}
            <span className="truncate text-xs text-muted-foreground">
              {state.session?.user.email ?? "Personal workspace"}
            </span>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state: sessionState } = useSession();
  const pathname = usePathname();
  const title =
    [
      ...navigation,
      { href: "/settings", title: "Settings" },
      { href: "/help", title: "Help" },
    ].find((item) => item.href === pathname)?.title ?? "Workspace";
  const { setTheme, resolvedTheme } = useTheme();
  const { loading, error, refresh } = useWorkspace();
  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only z-50 bg-background p-3 focus:not-sr-only focus:fixed"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Workspace
            </span>
            <ChevronRight className="hidden size-3 text-muted-foreground sm:block" />
            <span className="truncate text-sm font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {sessionState.status === "authenticated" ? (
              <Badge variant="outline">Early access</Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Log in
              </Button>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Toggle color theme"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              <Sun className="hidden dark:block" />
              <Moon className="dark:hidden" />
            </Button>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Your workspace</Badge>
              <span>
                {loading
                  ? "Loading your Google Drive data..."
                  : "Your connected Google Drive accounts"}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => void refresh()}
            >
              Refresh
              <ChevronRight />
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error} Use Refresh to try again.
            </p>
          )}
          {children}
          <footer className="mt-auto flex flex-wrap justify-between gap-2 pt-4 text-xs text-muted-foreground">
            <span>DrivePool — a little more room for everything.</span>
            <span>Your files stay in Google Drive</span>
          </footer>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
