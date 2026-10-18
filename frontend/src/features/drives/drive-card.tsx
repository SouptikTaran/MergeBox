import Link from "next/link";
import { ArrowUpRight, HardDrive } from "lucide-react";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DriveAccount } from "@/features/workspace/types";

export function DriveCard({ account }: { account: DriveAccount }) {
  const percentage = (account.usedGB / account.capacityGB) * 100;
  return (
    <Frame spacing="default" id={account.id}>
      <FramePanel>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <HardDrive className="size-5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{account.label}</h3>
            </div>
            <Badge variant={percentage > 80 ? "warning-light" : "success-light"}>
              {percentage > 80 ? "Low space" : "Healthy"}
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{account.email}</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between gap-2 text-xs">
              <span>
                <span className="font-semibold tabular-nums">{account.usedGB} GB</span>{" "}
                <span className="text-muted-foreground">of {account.capacityGB} GB</span>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {Math.round(percentage)}%
              </span>
            </div>
            <Progress value={percentage} aria-label={`${account.label} storage usage`} />
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {account.files.toLocaleString("en-US")} sample files
            </span>
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link href="/files" />}
            >
              Browse
              <ArrowUpRight />
            </Button>
          </div>
        </div>
      </FramePanel>
    </Frame>
  );
}
