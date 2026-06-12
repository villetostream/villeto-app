import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Outer scope tabs (Company / Team / My Requests) */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-lg" />
        ))}
      </div>

      {/* Status filter tabs row */}
      <div className="flex items-center gap-6 border-b border-border pb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>

      {/* Search + filter row */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Skeleton className="h-11 w-full rounded-none" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-none border-t border-border/40" />
        ))}
      </div>
    </div>
  );
}
