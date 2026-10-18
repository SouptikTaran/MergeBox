"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { Session, SessionState } from "./types";

const SessionContext = createContext<{
  state: SessionState;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading", session: null });
  const requestId = useRef(0);
  const loadSession = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const session = await apiRequest<Session>("/api/auth/me");
      if (id === requestId.current) setState({ status: "authenticated", session });
    } catch (error) {
      if (id !== requestId.current) return;
      setState(
        error instanceof ApiError && error.status === 401
          ? { status: "anonymous", session: null }
          : {
              status: "error",
              session: null,
              message:
                "We couldn’t reach your account. Check the connection and try again.",
            },
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    setState({ status: "loading", session: null });
    await loadSession();
  }, [loadSession]);

  useEffect(() => {
    const expire = () => {
      requestId.current++;
      setState({ status: "anonymous", session: null });
    };
    window.addEventListener("session-expired", expire);
    const focus = () => {
      void loadSession();
    };
    window.addEventListener("focus", focus);
    return () => {
      window.removeEventListener("session-expired", expire);
      window.removeEventListener("focus", focus);
    };
  }, [loadSession]);

  useEffect(() => {
    // loadSession only commits state after the asynchronous network request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession();
  }, [loadSession]);

  const logout = useCallback(async () => {
    if (state.status !== "authenticated") return;
    try {
      await apiRequest<void>("/api/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": state.session.csrfToken },
      });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    requestId.current++;
    setState({ status: "anonymous", session: null });
  }, [state]);

  return (
    <SessionContext.Provider value={{ state, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
