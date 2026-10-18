"use client";

import { HardDrive, Plus, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ConnectDriveButton() {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Connect drive
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <HardDrive className="size-7 text-muted-foreground" />
          <DialogTitle>Bring your drives together</DialogTitle>
          <DialogDescription>
            Drive connections are coming in the next release.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 text-sm">
          <Badge variant="primary-light">Coming soon</Badge>
          <p>
            Link personal Google Drive accounts to see files and storage in one place.
            This preview uses sample accounts; no Drive has been connected.
          </p>
          <div className="flex items-start gap-2 text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" />
            <p>
              Google sign-in only verifies your identity. Drive access will require your
              separate consent.
            </p>
          </div>
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
