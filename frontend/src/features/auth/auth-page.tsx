"use client";

import Link from "next/link";
import {
  ArrowRight,
  CircleUserRound,
  LockKeyhole,
  LogIn,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { API_ORIGIN } from "@/lib/api/client";
import { useSession } from "./session-provider";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { state, refresh } = useSession();
  const signup = mode === "signup";

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex justify-center">
        <Badge variant="outline">Your personal cloud workspace</Badge>
      </div>
      <Card>
        <CardHeader className="gap-3">
          <CircleUserRound
            aria-hidden="true"
            className="size-8 text-muted-foreground"
            strokeWidth={1.3}
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            {signup ? "A little more room." : "Welcome back."}
          </h1>
          <CardDescription>
            {signup
              ? "Create your DrivePool account in a moment."
              : "Log in to your DrivePool workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state.status === "loading" ? (
            <div role="status" className="flex flex-col gap-3">
              <span className="sr-only">Checking your session</span>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : state.status === "authenticated" ? (
            <>
              <div className="flex flex-col gap-2">
                <Badge variant="success-light">You’re signed in</Badge>
                <p className="break-all text-sm text-muted-foreground">
                  {state.session.user.email}
                </p>
              </div>
              <Button nativeButton={false} render={<Link href="/" />} className="w-full">
                Open workspace
                <ArrowRight />
              </Button>
            </>
          ) : (
            <>
              {state.status === "error" && (
                <div role="alert" className="flex flex-col items-start gap-2">
                  <p className="text-sm text-muted-foreground">
                    We couldn’t check your session. Try again or continue with Google.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => void refresh()}>
                    <RefreshCw aria-hidden="true" />
                    Retry connection
                  </Button>
                </div>
              )}
              <Button
                nativeButton={false}
                render={<a href={`${API_ORIGIN}/api/auth/google`} />}
                className="w-full"
              >
                <LogIn aria-hidden="true" />
                {signup ? "Sign up with Google" : "Continue with Google"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {signup
                  ? "New here? Your account is created automatically."
                  : "Use the Google account you signed up with."}
              </p>
            </>
          )}
          <div className="flex items-start gap-2 border-t pt-4">
            <ShieldCheck
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Sign-in verifies your identity. Your Drive files remain private until you
              separately choose to connect a drive.
            </p>
          </div>
        </CardContent>
        <CardFooter className="justify-center gap-1 text-xs">
          <span className="text-muted-foreground">
            {signup ? "Already have an account?" : "New to DrivePool?"}
          </span>
          <Link
            href={signup ? "/login" : "/signup"}
            className="font-medium underline underline-offset-4"
          >
            {signup ? "Log in" : "Create an account"}
          </Link>
        </CardFooter>
      </Card>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <LockKeyhole aria-hidden="true" className="size-3.5" />
        <span>No extra password to remember.</span>
      </div>
    </div>
  );
}
