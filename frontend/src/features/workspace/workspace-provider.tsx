"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiRequest } from "@/lib/api/client";
import type { Account, StorageOverview } from "./api-types";
const WorkspaceContext = createContext<{
  accounts: Account[];
  storage: StorageOverview | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  revision: number;
} | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [storage, setStorage] = useState<StorageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError(null);
    setStorage(null);
    try {
      const data = await apiRequest<{ accounts: Account[] }>("/api/drive/accounts", {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setAccounts(data.accounts);
      setRevision((v) => v + 1);
      const quota = await apiRequest<StorageOverview>("/api/drive/storage", {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setStorage(quota);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : "Unable to load your drives.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    // Fetch only after the session gate mounts this provider.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return () => active.current?.abort();
  }, [refresh]);
  return (
    <WorkspaceContext.Provider
      value={{ accounts, storage, loading, error, refresh, revision }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace requires WorkspaceProvider");
  return value;
}
