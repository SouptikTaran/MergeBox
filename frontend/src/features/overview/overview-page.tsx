"use client";

import Link from "next/link";
import { ArrowRight, Cloud, Files, HardDrive, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Frame, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { ConnectDriveButton } from "@/features/drives/connect-drive-button";
import { DriveCard } from "@/features/drives/drive-card";
import { FileGrid } from "@/features/files/file-grid";
import {
  previewAccounts,
  previewFiles,
  accountColors,
} from "@/features/workspace/preview-data";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { EmptyWorkspace } from "@/features/workspace/empty-workspace";
import { AuthOutcome } from "@/features/auth/auth-outcome";

export function OverviewPage() {
  const { preview } = useWorkspace();
  const total = previewAccounts.reduce((sum, a) => sum + a.capacityGB, 0);
  const used = previewAccounts.reduce((sum, a) => sum + a.usedGB, 0);
  return (
    <>
      <AuthOutcome />
      <PageHeader
        title="Your space, in one place."
        description="A clear view of everything across your drives."
        action={<ConnectDriveButton />}
      />
      {preview ? (
        <>
          <div className="grid min-w-0 gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Frame spacing="default">
              <FrameHeader>
                <div className="flex items-center justify-between">
                  <FrameTitle>Storage overview</FrameTitle>
                  <Badge variant="outline">3 sample drives</Badge>
                </div>
              </FrameHeader>
              <FramePanel>
                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-2xl font-semibold tracking-tight tabular-nums">
                        {used.toFixed(1)}{" "}
                        <span className="text-lg text-muted-foreground">
                          / {total} GB
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Combined personal storage
                      </p>
                    </div>
                    <Cloud className="size-8 text-muted-foreground" strokeWidth={1.3} />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div
                      className="flex h-5 gap-1 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label="Sample storage: Personal 24.8 GB, Studio 38.2 GB, Archive 12.4 GB, available 139.6 GB"
                    >
                      {previewAccounts.map((a) => (
                        <span
                          key={a.id}
                          className={accountColors[a.color]}
                          style={{ width: `${(a.usedGB / total) * 100}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {previewAccounts.map((a) => (
                        <div key={a.id} className="flex items-center gap-2 text-xs">
                          <span
                            className={`size-2 rounded-full ${accountColors[a.color]}`}
                          />
                          <span className="text-muted-foreground">{a.label}</span>
                          <span className="tabular-nums">{a.usedGB} GB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                    <ShieldCheck className="size-4" />
                    <span>
                      {(total - used).toFixed(1)} GB available across your sample drives
                    </span>
                  </div>
                </div>
              </FramePanel>
            </Frame>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Frame spacing="default">
                <FramePanel>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        Files across drives
                      </span>
                      <span className="text-2xl font-semibold tracking-tight tabular-nums">
                        2,436
                      </span>
                      <span className="text-xs text-muted-foreground">
                        One place to find what matters
                      </span>
                    </div>
                    <Files className="size-6 text-muted-foreground" strokeWidth={1.4} />
                  </div>
                </FramePanel>
              </Frame>
              <Frame spacing="default">
                <FramePanel>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        Connected drives
                      </span>
                      <span className="text-2xl font-semibold tracking-tight tabular-nums">
                        03
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Personal, studio, and archive
                      </span>
                    </div>
                    <HardDrive
                      className="size-6 text-muted-foreground"
                      strokeWidth={1.4}
                    />
                  </div>
                </FramePanel>
              </Frame>
            </div>
          </div>
          <section className="flex flex-col gap-3" aria-labelledby="drives-heading">
            <div className="flex items-center justify-between gap-2">
              <h2 id="drives-heading" className="text-sm font-semibold">
                Your drives
              </h2>
              <Button
                size="sm"
                variant="ghost"
                nativeButton={false}
                render={<Link href="/drives" />}
              >
                Manage drives
                <ArrowRight />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {previewAccounts.map((account) => (
                <DriveCard key={account.id} account={account} />
              ))}
            </div>
          </section>
          <FileGrid files={previewFiles} compact />
        </>
      ) : (
        <EmptyWorkspace />
      )}
    </>
  );
}
