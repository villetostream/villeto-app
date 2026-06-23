import { Skeleton } from "@/components/ui/skeleton";

/**
 * DashboardShellSkeleton
 * ──────────────────────────────────────────────────────────────
 * Painted immediately on first render (before auth resolves and
 * before any API call completes) to give the browser a real LCP
 * candidate as early as possible.
 *
 * Layout mirrors DashboardLayoutContent exactly:
 *   • Sidebar rail (same width as the real collapsed sidebar)
 *   • Top header bar (h-16, border-b)
 *   • Main content area with a generic page skeleton
 *
 * Using a layout skeleton instead of a spinner means the browser
 * can paint a "stable-looking" page on the very first frame,
 * satisfying LCP without waiting for auth or data.
 */
export function DashboardShellSkeleton() {
  return (
    <div
      className="flex bg-dashboard-background h-screen overflow-hidden"
      aria-hidden="true"
      suppressHydrationWarning
    >
      {/* ── Sidebar rail ── */}
      <div 
        className="w-[72px] h-full flex flex-col items-center py-4 gap-4 border-r border-border/60 shrink-0"
        suppressHydrationWarning
      >
        {/* Logo placeholder */}
        <Skeleton className="w-9 h-9 rounded-xl mb-2" />
        {/* Nav icon placeholders */}
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="w-9 h-9 rounded-xl" />
        ))}
      </div>

      {/* ── Main area ── */}
      <div 
        className="flex flex-col flex-1 h-full overflow-hidden"
        suppressHydrationWarning
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 h-16 border-b border-border/60 shrink-0"
          suppressHydrationWarning
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-36 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>

        {/* Content area */}
        <div 
          className="flex-1 overflow-hidden p-5 space-y-5"
          suppressHydrationWarning
        >
          {/* Page title row */}
          <div className="flex items-center justify-between" suppressHydrationWarning>
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" suppressHydrationWarning>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-3 bg-white" suppressHydrationWarning>
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-7 w-16 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="rounded-xl border border-border/60 bg-white overflow-hidden" suppressHydrationWarning>
            {/* Table header row */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border/40" suppressHydrationWarning>
              <Skeleton className="h-8 w-48 rounded-lg" />
              <div className="ml-auto flex gap-2">
                <Skeleton className="h-8 w-32 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
            {/* Table rows */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-3.5 border-b border-border/30 last:border-0"
                suppressHydrationWarning
              >
                <Skeleton className="h-4 w-8 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
