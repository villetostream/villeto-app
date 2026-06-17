import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { isRetryableError } from "@/shared/lib/errors/api-errors";

interface ErrorStateProps {
  /** The caught error — used to detect transient/retryable conditions */
  error?: unknown;
  /** Override the default copy. If omitted, a sensible message is derived from `error`. */
  title?: string;
  description?: string;
  /** Called when the user clicks "Try again" — usually a query's refetch */
  onRetry?: () => void;
  className?: string;
}

const FALLBACK_TITLE = "Something went wrong";
const FALLBACK_DESCRIPTION = "We couldn't load this. Please try again.";
const RETRYABLE_DESCRIPTION =
  "The server is momentarily busy. This usually resolves in a few seconds.";

/**
 * ErrorState
 * ───────────────────────────────────────────────────────────
 * Used in the `error` branch of a React Query result, in place of
 * rendering nothing or letting the page crash. Distinct from
 * EmptyState: this means the request failed, not that the list is
 * legitimately empty.
 *
 * Usage:
 *   const { data, error, isLoading, refetch } = useCompanyExpenses();
 *   if (error) return <ErrorState error={error} onRetry={refetch} />;
 */
export function ErrorState({
  error,
  title,
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  const retryable = isRetryableError(error);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-destructive/20 bg-destructive/5",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4"
      >
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">
        {title ?? FALLBACK_TITLE}
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {description ?? (retryable ? RETRYABLE_DESCRIPTION : FALLBACK_DESCRIPTION)}
      </p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-5">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}
