import type { Metadata } from "next";
import { Suspense } from "react";
import { FilesPage } from "@/features/files/files-page";

export const metadata: Metadata = { title: "All files" };
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading files...</p>}>
      <FilesPage />
    </Suspense>
  );
}
