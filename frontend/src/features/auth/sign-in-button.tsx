"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <Button size="sm" nativeButton={false} render={<Link href="/login" />}>
      <LogIn />
      Log in / Sign up
    </Button>
  );
}
