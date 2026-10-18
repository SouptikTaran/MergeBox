import Link from "next/link";
import { ArrowLeft, Boxes } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="flex flex-wrap items-center justify-between gap-4 p-6 md:px-10">
        <Link href="/" className="flex items-center gap-2" aria-label="DrivePool home">
          <Boxes aria-hidden="true" className="size-7" strokeWidth={1.7} />
          <span className="text-xl font-semibold tracking-tight">DrivePool.</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Open workspace
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">{children}</main>
      <footer className="flex flex-wrap justify-center gap-4 p-6 text-xs text-muted-foreground">
        <span>Your space, in one place.</span>
        <Link href="/help" className="underline underline-offset-4">
          Help & getting started
        </Link>
      </footer>
    </div>
  );
}
