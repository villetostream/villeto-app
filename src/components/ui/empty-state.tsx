import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Lucide/iconsax icon element, rendered inside a muted circle */
  icon?: ReactNode;
  /** Short, direct statement of what's missing — not an apology */
  title: string;
  /** One sentence on what the user can do next */
  description?: string;
  /** Primary action, e.g. "Add expense" */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary, lower-emphasis action, e.g. "Clear filters" */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * EmptyState
 * ───────────────────────────────────────────────────────────
 * Used wherever a list/table/grid has zero items — including
 * the zero-results case after filtering, which needs different
 * copy than "you have nothing yet". Pass description accordingly.
 *
 * Usage:
 *   <EmptyState
 *     icon={<Inbox className="w-6 h-6" />}
 *     title="No expense reports yet"
 *     description="Reports you submit will show up here."
 *     action={{ label: "Create report", onClick: () => router.push(...) }}
 *   />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-muted",
        className
      )}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4"
        >
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-5">
          {action && (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
