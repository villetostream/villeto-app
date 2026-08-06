import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-black/[0.04] animate-pulse rounded-md", className)}
      suppressHydrationWarning
      {...props}
    />
  )
}

export { Skeleton }
