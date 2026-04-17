/**
 * setupGuideEvents.ts
 * ─────────────────────────────────────────────────────────────
 * Tiny helpers that page-level action handlers call after a
 * successful operation so VilletoSetupGuide can silently tick
 * the relevant step — even when the guide is minimised or the
 * user has skipped the guided flow.
 *
 * Usage (in any page/component):
 *
 *   import { notifySetupGuide } from "@/lib/setupGuideEvents";
 *
 *   // After a successful directory upload:
 *   notifySetupGuide("directory");
 *
 *   // After inviting a user:
 *   notifySetupGuide("invitations");
 *
 * The Setup Guide listens for these window events and ticks
 * the matching step automatically.
 * ─────────────────────────────────────────────────────────────
 */

/** Map of step IDs → custom event names */
export const SETUP_GUIDE_EVENTS = {
  directory:        "villeto:directory-uploaded",
  invitations:      "villeto:invitation-sent",
  "expense-category": "villeto:expense-category-created",
  policy:           "villeto:policy-created",
  "account-details":  "villeto:account-details-saved",
  report:           "villeto:report-created",
} as const;

export type SetupStepId = keyof typeof SETUP_GUIDE_EVENTS;

/**
 * Dispatch a custom window event to notify VilletoSetupGuide
 * that a setup step has been completed.
 *
 * Call this from your success handler, e.g.:
 *   onSuccess={() => notifySetupGuide("directory")}
 */
export function notifySetupGuide(stepId: SetupStepId): void {
  if (typeof window === "undefined") return;
  const eventName = SETUP_GUIDE_EVENTS[stepId];
  window.dispatchEvent(new CustomEvent(eventName));
}
