import { GenericPageSkeleton } from "@/components/ui/skeletons";

/**
 * Generic fallback loader for routes that don't yet have a bespoke
 * skeleton (see components/ui/skeletons.tsx for content-shaped
 * alternatives — prefer those for any route whose final layout is
 * already known).
 *
 * Uses GenericPageSkeleton (header bar + table skeleton) instead of
 * a spinner so the browser has a content-shaped LCP candidate and
 * there is no jarring spinner → content pop-in transition.
 */
export default function PageLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page content"
      className="p-5"
    >
      <GenericPageSkeleton />
    </div>
  );
}
