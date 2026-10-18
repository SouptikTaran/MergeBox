"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/features/workspace/workspace-provider";
import { EmptyWorkspace } from "@/features/workspace/empty-workspace";
import type { FilePage } from "@/features/workspace/api-types";
import { apiRequest } from "@/lib/api/client";
import { FileGrid } from "./file-grid";

export function FilesPage() {
  const params = useSearchParams();
  const { revision } = useWorkspace();
  const initialAccount = params.get("accountId") ?? "";
  return (
    <FileBrowser key={`${initialAccount}:${revision}`} initialAccount={initialAccount} />
  );
}
function FileBrowser({ initialAccount }: { initialAccount: string }) {
  const { accounts, loading: workspaceLoading, revision } = useWorkspace();
  const [accountId, setAccountId] = useState(initialAccount);
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<FilePage | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursor = cursors[page];
  useEffect(() => {
    if (workspaceLoading) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      setError(null);
      setData(null);
      try {
        const query = new URLSearchParams({ sort, direction, pageSize: "50" });
        if (accountId) query.set("accountId", accountId);
        if (cursor) query.set("pageToken", cursor);
        const result = await apiRequest<FilePage>(`/api/drive/files?${query}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Could not load files.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [accountId, sort, direction, cursor, reload, revision, workspaceLoading]);
  function restart() {
    setCursors([null]);
    setPage(0);
    setData(null);
    setReload((v) => v + 1);
  }
  const pending = busy || workspaceLoading;
  return (
    <>
      <PageHeader
        title="All files"
        description="Files owned by your connected accounts, excluding trash."
      />
      {!accounts.length && !workspaceLoading ? (
        <EmptyWorkspace />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 text-sm">
            <label className="flex min-w-0 flex-col gap-1">
              Account
              <select
                aria-label="Filter by account"
                className="max-w-full rounded-md border bg-background p-2"
                value={accountId}
                disabled={pending}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  restart();
                }}
              >
                <option value="">All accounts</option>
                {accounts
                  .filter((a) => a.status !== "disconnecting")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.email}
                    </option>
                  ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Sort
              <select
                aria-label="Sort files"
                className="rounded-md border bg-background p-2"
                value={sort}
                disabled={pending}
                onChange={(e) => {
                  setSort(e.target.value);
                  restart();
                }}
              >
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="modifiedTime">Modified</option>
                <option value="mimeType">Type</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Order
              <select
                aria-label="Sort direction"
                className="rounded-md border bg-background p-2"
                value={direction}
                disabled={pending}
                onChange={(e) => {
                  setDirection(e.target.value);
                  restart();
                }}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
            <Button variant="outline" disabled={pending} onClick={restart}>
              Refresh files
            </Button>
          </div>
          {pending ? (
            <p role="status">Loading files from Google Drive...</p>
          ) : error ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p>{error}</p>
              <Button onClick={restart}>Retry file list</Button>
            </div>
          ) : (
            data && (
              <>
                {data.partial && (
                  <div role="alert" className="text-sm">
                    Some accounts could not be listed. Results below are incomplete.{" "}
                    {data.errors.map((e) => (
                      <p key={e.accountId}>
                        {accounts.find((a) => a.id === e.accountId)?.email ??
                          "Drive account"}
                        :{" "}
                        {e.code === "drive_api_disabled"
                          ? "Google Drive API is disabled for this app. Enable it in the OAuth client's Cloud project, then refresh."
                          : e.code === "reconnect_required"
                            ? "Reconnect this drive on the Connected drives page."
                            : "Unable to load files; refresh or narrow the account selection."}
                      </p>
                    ))}
                  </div>
                )}
                <FileGrid
                  key={`${accountId}:${sort}:${direction}:${page}:${reload}:${revision}`}
                  files={data.files}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p>
                    {data.total.toLocaleString()} {data.partial ? "available" : "listed"}{" "}
                    files · Page {page + 1}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((v) => v - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!data.nextPageToken}
                      onClick={() => {
                        setCursors((v) => [...v.slice(0, page + 1), data.nextPageToken]);
                        setPage((v) => v + 1);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )
          )}
        </>
      )}
    </>
  );
}
