import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading workspace">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-48 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
