"use client";

import { useMemo, useState } from "react";
import {
  useTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Archive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Film,
  Search,
  SearchX,
} from "lucide-react";
import {
  Frame,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame";
import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { previewAccounts, accountColors } from "@/features/workspace/preview-data";
import type { DriveFile } from "@/features/workspace/types";

const fileIcons = {
  Document: FileText,
  Image: FileImage,
  Spreadsheet: FileSpreadsheet,
  Video: Film,
  Archive,
};
const fileColors = {
  Document: "text-blue-600 dark:text-blue-400",
  Image: "text-violet-600 dark:text-violet-400",
  Spreadsheet: "text-emerald-700 dark:text-emerald-400",
  Video: "text-rose-600 dark:text-rose-400",
  Archive: "text-amber-700 dark:text-amber-400",
};

export function FileGrid({
  files,
  compact = false,
}: {
  files: DriveFile[];
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DriveFile | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "modified", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: compact ? 5 : 10,
  });
  const filtered = useMemo(
    () =>
      files.filter((file) =>
        `${file.name} ${file.kind} ${previewAccounts.find((a) => a.id === file.accountId)?.label}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [files, query],
  );
  const columns = useMemo<ColumnDef<DataGridFeatures, DriveFile>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="File name" />
        ),
        size: 330,
        cell: ({ row }) => {
          const Icon = fileIcons[row.original.kind];
          return (
            <button
              className="flex items-center gap-3 text-left font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => setSelected(row.original)}
            >
              <Icon className={`size-4 shrink-0 ${fileColors[row.original.kind]}`} />
              <span>{row.original.name}</span>
            </button>
          );
        },
      },
      {
        accessorKey: "accountId",
        header: "Location",
        size: 150,
        cell: ({ row }) => {
          const account = previewAccounts.find((a) => a.id === row.original.accountId)!;
          return (
            <div className="flex items-center gap-2">
              <span className={`size-1.5 rounded-full ${accountColors[account.color]}`} />
              <span className="text-muted-foreground">{account.label}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "sizeMB",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Size" />,
        size: 110,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.sizeMB} MB</span>
        ),
        meta: {
          headerClassName: "text-end [&>div]:justify-end",
          cellClassName: "text-end tabular-nums",
        },
      },
      {
        accessorKey: "modified",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Modified" />,
        size: 150,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(`${row.original.modified}T12:00:00Z`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
        ),
      },
    ],
    [],
  );
  const table = useTable({
    features: dataGridFeatures,
    data: filtered,
    columns,
    getRowId: (row: DriveFile) => row.id,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });
  return (
    <>
      <Frame spacing="default" className="min-w-0">
        <FrameHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FrameTitle>{compact ? "Recent files" : "File library"}</FrameTitle>
            <div className="relative min-w-0 w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search files"
                placeholder="Search files or drives…"
                className="pl-9"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
              />
            </div>
          </div>
        </FrameHeader>
        <DataGrid
          table={table}
          recordCount={filtered.length}
          tableClassNames={{ base: "min-w-[720px]" }}
          emptyMessage={
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>No matching files</EmptyTitle>
                <EmptyDescription>Try another file name or drive.</EmptyDescription>
              </EmptyHeader>
              <Button size="sm" variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            </Empty>
          }
        >
          <FramePanel className="p-0">
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </FramePanel>
          <FrameFooter>
            <DataGridPagination />
          </FrameFooter>
        </DataGrid>
      </Frame>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="break-all">{selected?.name}</DialogTitle>
            <DialogDescription>Sample file details</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="flex flex-col gap-4">
              <Badge variant="outline">Preview file</Badge>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{selected.kind}</dd>
                <dt className="text-muted-foreground">Size</dt>
                <dd>{selected.sizeMB} MB</dd>
                <dt className="text-muted-foreground">Drive</dt>
                <dd>{previewAccounts.find((a) => a.id === selected.accountId)?.label}</dd>
                <dt className="text-muted-foreground">Modified</dt>
                <dd>{selected.modified}</dd>
              </dl>
              <p className="text-sm text-muted-foreground">
                This is a sample file. Opening files in Google Drive will be available
                once Drive connections are enabled.
              </p>
            </div>
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}
