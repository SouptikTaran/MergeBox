"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { previewFiles } from "@/features/workspace/preview-data";
import { EmptyWorkspace } from "@/features/workspace/empty-workspace";
import { FileGrid } from "./file-grid";

export function FilesPage() {
  const { preview } = useWorkspace();
  return (
    <>
      <PageHeader
        title="All files"
        description="Everything you need, without switching accounts."
      />
      {preview ? <FileGrid files={previewFiles} /> : <EmptyWorkspace />}
    </>
  );
}
