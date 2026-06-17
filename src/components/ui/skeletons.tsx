import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * Content-shaped loading skeletons.
 * ───────────────────────────────────────────────────────────
 * Replaces the single generic <PageLoading /> spinner everywhere
 * a route's final layout is already known. Mirroring the real
 * layout (not just "a spinner") avoids the perceived-load-time
 * penalty of a spinner-then-pop-in transition, and prevents
 * layout shift once real data arrives.
 *
 * Each route's loading.tsx should import the matching skeleton
 * instead of the shared PageLoading fallback. Example:
 *
 *   // app/(dashboard)/dashboard/loading.tsx
 *   import { DashboardSkeleton } from "@/components/ui/skeletons";
 *   export default DashboardSkeleton;
 */

export function StatsCardSkeleton() {
  return (
    <Card className="p-1 border border-muted gap-1" aria-hidden="true">
      <div className="flex items-center justify-between border border-muted rounded-lg">
        <div className="p-3 pb-[.6rem] space-y-2 w-full">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full mr-3" />
      </div>
      <div className="p-2.5 px-3 border border-muted rounded">
        <Skeleton className="h-3 w-28" />
      </div>
    </Card>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div
      className="flex items-center gap-4 py-3 px-4 border-b border-muted last:border-b-0"
      aria-hidden="true"
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 flex-1"
          style={{ maxWidth: i === 0 ? "180px" : "120px" }}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Card className="overflow-hidden" role="status" aria-label="Loading table data">
      <div className="flex items-center gap-4 py-3 px-4 border-b border-muted bg-muted/40">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" style={{ maxWidth: "100px" }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </Card>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="p-6" role="status" aria-label="Loading chart">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-[240px] w-full rounded-lg" />
    </Card>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3" aria-hidden="true">
      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Mirrors the dashboard landing page: banner, stats grid, chart, table+activity. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading dashboard">
      <Skeleton className="h-20 w-full rounded-xl" />

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-12 w-80 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      <ChartSkeleton />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3">
          <TableSkeleton rows={4} columns={4} />
        </div>
        <Card className="p-4">
          <Skeleton className="h-4 w-24 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </Card>
      </div>
    </div>
  );
}

/** Generic page-level skeleton for routes without a bespoke layout yet. */
export function GenericPageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading page">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
