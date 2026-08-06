import { Skeleton } from "@/components/ui/skeleton";

export function ExpenseDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-4 w-48 mb-1" />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Expense Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview Items Section */}
          <div className="bg-white border border-black/[0.06] rounded-[14px]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-black/[0.06]">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>

            {/* Table Header */}
            <div className="bg-[#f9faf9] p-3 flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Table Rows */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-t border-black/[0.06] p-3 flex gap-4 items-center">
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>

          {/* CO's Note Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="bg-[#f0faf8] rounded-[14px] p-4">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>

        {/* Right Column - Timeline */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 pt-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
