import type { Metadata } from "next";
import { FilesPage } from "@/features/files/files-page";

export const metadata: Metadata = { title: "All files" };
export default function Page() {
  return <FilesPage />;
}
