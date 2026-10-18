"use client";

import { createContext, useContext, useState } from "react";

const WorkspaceContext = createContext<{
  preview: boolean;
  setPreview: (value: boolean) => void;
} | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = useState(true);
  return (
    <WorkspaceContext.Provider value={{ preview, setPreview }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace requires WorkspaceProvider");
  return value;
}
