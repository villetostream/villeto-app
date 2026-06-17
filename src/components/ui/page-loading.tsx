import { Loader2 } from "lucide-react";

/**
 * Generic fallback loader for routes that don't yet have a bespoke
 * skeleton (see components/ui/skeletons.tsx for content-shaped
 * alternatives — prefer those for any route whose final layout is
 * already known).
 *
 * Accessibility fix: the previous version had no role, so screen
 * readers announced nothing while content loaded. role="status" +
 * aria-live="polite" makes the wait state announced; the visible
 * text and the icon are both decorative duplicates of that one
 * announcement, so the icon is aria-hidden to avoid double output.
 */
export default function PageLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center h-full max-h-screen gap-3"
    >
      <Loader2
        className="h-8 w-8 animate-spin text-primary"
        aria-hidden="true"
      />
      <span className="text-primary dark:text-white md:text-lg">
        Loading…
      </span>
    </div>
  );
}
