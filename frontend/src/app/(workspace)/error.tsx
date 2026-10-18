"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Something didn’t load</h1>
      <p className="text-sm text-muted-foreground">
        Please try loading this workspace again.
      </p>
      <Button size="sm" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
