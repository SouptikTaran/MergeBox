import type { Metadata } from "next";
import { DrivesPage } from "@/features/drives/drives-page";

export const metadata: Metadata = { title: "Connected drives" };
export default function Page() {
  return <DrivesPage />;
}
