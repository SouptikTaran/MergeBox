"use client";

import { HardDrive } from "lucide-react";
import { Frame, FramePanel } from "@/components/reui/frame";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./workspace-provider";

export function EmptyWorkspace() {
  const { setPreview } = useWorkspace();
  return (
    <Frame spacing="default">
      <FramePanel>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HardDrive />
            </EmptyMedia>
            <EmptyTitle>A fresh start for your files</EmptyTitle>
            <EmptyDescription>
              Drive linking is coming soon. Explore a sample workspace while we get things
              ready.
            </EmptyDescription>
          </EmptyHeader>
          <Button size="sm" onClick={() => setPreview(true)}>
            Explore preview
          </Button>
        </Empty>
      </FramePanel>
    </Frame>
  );
}
