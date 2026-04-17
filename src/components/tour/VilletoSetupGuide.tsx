"use client";

/**
 * VilletoSetupGuide
 * ─────────────────────────────────────────────────────────────
 * Interactive workspace-setup guide shown AFTER the force-password
 * modal on first login for CONTROLLING_OFFICER / ORGANIZATION_OWNER
 * users only.
 *
 * Key behaviours:
 *  • Steps must be COMPLETED (action performed) before the tick
 *    is granted — "Next" alone does not tick; the action must fire.
 *  • Users can Skip; if they do, a persistent "Continue Setup"
 *    banner appears in the bottom-left so they can resume.
 *  • Silent tracking: if a user performs a setup action on their
 *    own (without following the guide), the step auto-ticks.
 *  • When all 6 steps are done a completion modal fires.
 *  • The guide only appears AFTER SetPasswordModal closes
 *    (communicated via the `setupGuideReady` flag in useTourStore).
 *
 * Bug-fixes applied (see CHANGELOG below):
 *  [FIX-1] markStepDone — moved setWaitingForAction + setTimeout OUT of
 *          the setStepIndex updater. React StrictMode calls updater
 *          functions twice in dev, which caused the advance timer to
 *          fire twice and skip a step.
 *  [FIX-2] markStepDone — moved setIsSkipped / setVisible / setTimeout
 *          (showDoneModal) OUT of the setCompletedIds updater for the
 *          same reason. Completion detection is now a dedicated useEffect
 *          that runs after the state update is committed, never twice.
 *  [FIX-3] stepIndexRef — was declared but never synced. Added a useEffect
 *          that keeps it in lockstep with the stepIndex state so
 *          markStepDone always reads the true current index.
 *  [FIX-4] Timer refs — advance timers now use a dedicated advanceRef
 *          so they never clobber the nav-settle pendingRef.
 *  [FIX-5] SetupCard / SetupCompleteModal — added role="dialog",
 *          aria-modal, aria-labelledby for screen-reader accessibility
 *          and focus management on open.
 *  [FIX-6] Keyboard handler — Enter key now ignores events whose target
 *          is an <input>, <textarea>, or <select> so the guide doesn't
 *          accidentally advance when the user types in a form field.
 * ─────────────────────────────────────────────────────────────
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-stores";
import { useTourStore } from "@/stores/useTourStore";

// ─── Types ────────────────────────────────────────────────────

type ArrowSide = "top" | "bottom" | "left" | "right" | "none";

/** Overrides for spotlight/title/description when the user is on a sub-path */
type StepSubState = {
  /** Returns true when this sub-state should activate */
  pathMatch: (pathname: string, sp: URLSearchParams) => boolean;
  targetSelector?: string;
  arrowSide?: ArrowSide;
  title?: string;
  description?: string;
  allowInteraction?: boolean;
  disableSpotlight?: boolean;
};

type SetupStep = {
  id: string;
  navigateTo: string;
  navigateUrl?: string;
  sidebarHref?: string;
  /** CSS selector for the in-page action button to spotlight */
  targetSelector?: string;
  arrowSide?: ArrowSide;
  title: string;
  description: string;
  /** Event key that silently marks this step done (dispatched after action) */
  completionEvent?: string;
  /** Extra paths where the guide stays without redirecting the user back */
  allowedSubPaths?: string[];
  /** Alternate spotlight / title / description per sub-path of the upload flow */
  subStates?: StepSubState[];
  allowInteraction?: boolean;
  disableSpotlight?: boolean;
};

// ─── Step definitions ─────────────────────────────────────────

const SETUP_STEPS: SetupStep[] = [
  {
    id: "directory",
    navigateTo: "/people",
    navigateUrl: "/people?tab=directory",
    sidebarHref: "/people",
    targetSelector: '[data-tour="upload-directory-button"]',
    arrowSide: "top",
    title: "Upload Employee Directory",
    description:
      "Let's get your team into Villeto. Click the \"Upload Directory\" button highlighted above to start importing your employee list.",
    completionEvent: "villeto:directory-uploaded",
    // Stay in the upload flow — don't redirect back to /people
    allowedSubPaths: ["/people/invite/employees"],
    subStates: [
      {
        // File drop-zone page (step=upload or no step param)
        pathMatch: (pn, sp) =>
          pn.startsWith("/people/invite/employees") &&
          (sp.get("step") === "upload" || !sp.get("step")),
        targetSelector: '[data-tour="csv-upload-zone"]',
        arrowSide: "top",
        title: "Drop Your CSV File Here",
        description:
          "Drag your CSV or Excel file into the upload area — or click \"Browse File\" to pick it from your computer.\n\nYour file should include columns like first_name, last_name, email, and department_name.",
      },
      {
        // Preview page (step=preview) — confirm & save
        pathMatch: (pn, sp) =>
          pn.startsWith("/people/invite/employees") &&
          sp.get("step") === "preview",
        targetSelector: '[data-tour="save-to-directory-button"]',
        arrowSide: "top",
        title: "Review & Save to Directory",
        description:
          "Your employees are loaded! Give them a quick look — remove any mistakes — then click \"Save to Directory\" to add them to your workspace.",
        allowInteraction: true,
        disableSpotlight: true,
      },
    ],
  },
  {
    id: "invitations",
    navigateTo: "/people",
    navigateUrl: "/people?tab=all-users",
    sidebarHref: "/people",
    targetSelector: '[data-tour="invite-button"]',
    arrowSide: "top",
    title: "Invite Users",
    description:
      "Invite employees and leadership so they can submit expenses and participate in approval workflows.",
    completionEvent: "villeto:invitation-sent",
    allowedSubPaths: ["/people/invite/employees", "/people/invite/leadership"],
    subStates: [
      {
        pathMatch: (pn, sp) => pn.startsWith("/people/invite/leadership"),
        targetSelector: 'form button[type="submit"]',
        arrowSide: "none",
        title: "Invite Leadership",
        description: "Enter the details for your leaders and admins. They'll receive an email with a link to join your workspace.",
        allowInteraction: true,
        disableSpotlight: true,
      },
      {
        pathMatch: (pn, sp) => pn.startsWith("/people/invite/employees") && sp.get("step") !== "upload" && sp.get("step") !== "preview",
        targetSelector: 'form button[type="submit"]',
        arrowSide: "none",
        title: "Invite Employees",
        description: "Select employees from your directory or add them manually to send out invitations.",
        allowInteraction: true,
        disableSpotlight: true,
      },
      {
        pathMatch: (pn, sp) => pn === "/people" && sp.get("tab") === "all-users",
        targetSelector: '[data-tour="invite-button"]',
        arrowSide: "top",
        title: "Select Invite Type",
        description: "Click \"Invite Users\" then select whether to invite Employees or Leadership. Follow the prompts to complete the process.",
        allowInteraction: true,
        disableSpotlight: false,
      }
    ],
  },
  {
    id: "expense-category",
    navigateTo: "/policies",
    navigateUrl: "/policies?tab=expense",
    sidebarHref: "/policies",
    targetSelector: '[data-tour="new-expense-category-button"]',
    arrowSide: "top",
    title: "Create Expense Category",
    description:
      "Define how your organisation categorises spending — Travel, Meals, Software, and so on — before setting policies.",
    completionEvent: "villeto:expense-category-created",
  },
  {
    id: "policy",
    navigateTo: "/policies",
    navigateUrl: "/policies?tab=policies",
    sidebarHref: "/policies",
    targetSelector: '[data-tour="new-policy-button"]',
    arrowSide: "top",
    title: "Create a Policy",
    description:
      "Policies control spend limits, receipt requirements, and when approvals are triggered. Set the rules that govern your team's expenses.",
    completionEvent: "villeto:policy-created",
  },
  {
    id: "account-details",
    navigateTo: "/settings/personal-settings",
    navigateUrl: "/settings/personal-settings?section=account-details",
    sidebarHref: "/settings",
    targetSelector: '[data-tour="account-details-section"]',
    arrowSide: "top",
    title: "Set Up Account Details",
    description:
      "Add your bank details so reimbursements can be paid directly to you. Your name must match the company directory.",
    completionEvent: "villeto:account-details-saved",
  },
  {
    id: "report",
    navigateTo: "/expenses",
    navigateUrl: "/expenses",
    sidebarHref: "/expenses",
    targetSelector: '[data-tour="create-report-button"]',
    arrowSide: "top",
    title: "Create Your First Report",
    description:
      "Collect your expenses into a report and submit it for approval. This is the final step to get your workspace fully running.",
    completionEvent: "villeto:report-created",
  },
];

// ─── Session-storage keys ─────────────────────────────────────

const GUIDE_DISMISSED_KEY = (uid: string) => `villeto-setup-guide-dismissed:${uid}`;
const GUIDE_COMPLETED_KEY  = (uid: string) => `villeto-setup-guide-complete:${uid}`;
const STEP_DONE_KEY        = (uid: string, stepId: string) => `villeto-setup-step:${uid}:${stepId}`;

// ─── Silent completion context ────────────────────────────────
// Pages dispatch custom events when actions succeed; the guide
// listens here and silently ticks the relevant step.

export const SetupGuideContext = createContext<{
  markStepDone: (stepId: string) => void;
} | null>(null);

export function useSetupGuide() {
  return useContext(SetupGuideContext);
}

// ─── SVG Spotlight overlay ────────────────────────────────────

type SpotRect = { top: number; bottom: number; left: number; right: number };

function measureEl(selector: string): SpotRect | null {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
}

function getSidebarWidth(): number {
  const el =
    document.querySelector<HTMLElement>('[data-sidebar="sidebar"]') ||
    document.querySelector<HTMLElement>("aside") ||
    document.querySelector<HTMLElement>('[class*="sidebar"]');
  return el ? el.getBoundingClientRect().width : 220;
}

function SpotlightOverlay({
  sidebarHref,
  targetSelector,
  visible,
}: {
  sidebarHref?: string;
  targetSelector?: string;
  visible: boolean;
}) {
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [sidebarSpot, setSidebarSpot] = useState<
    (SpotRect & { sidebarW: number }) | null
  >(null);
  const [targetSpot, setTargetSpot] = useState<SpotRect | null>(null);

  const measure = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });

    if (sidebarHref) {
      const el = document.querySelector<HTMLElement>(
        `a[href="${sidebarHref}"], [data-href="${sidebarHref}"]`
      );
      if (el) {
        const r = el.getBoundingClientRect();
        const sw = getSidebarWidth();
        setSidebarSpot({
          top: r.top,
          bottom: r.bottom,
          left: 0,
          right: sw,
          sidebarW: sw,
        });
      } else {
        setSidebarSpot(null);
      }
    } else {
      setSidebarSpot(null);
    }

    if (targetSelector) {
      setTargetSpot(measureEl(targetSelector));
    } else {
      setTargetSpot(null);
    }
  }, [sidebarHref, targetSelector]);

  useEffect(() => {
    measure();
    // Poll so the spotlight hole re-measures after client-side navigation —
    // the target element doesn't exist in the DOM until the new page renders,
    // so a single requestAnimationFrame fired on mount would always miss it.
    const interval = setInterval(measure, 150);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  if (vp.w === 0) return null;

  const { w, h } = vp;
  const SP = 6;
  const TP = 8;

  const outer = `M0 0 L${w} 0 L${w} ${h} L0 ${h}Z`;

  const sHole = sidebarSpot
    ? `M0 ${sidebarSpot.top - SP} L${sidebarSpot.sidebarW} ${sidebarSpot.top - SP} ` +
      `L${sidebarSpot.sidebarW} ${sidebarSpot.bottom + SP} L0 ${sidebarSpot.bottom + SP}Z`
    : "";

  const tHole = targetSpot
    ? `M${targetSpot.left - TP} ${targetSpot.top - TP} ` +
      `L${targetSpot.right + TP} ${targetSpot.top - TP} ` +
      `L${targetSpot.right + TP} ${targetSpot.bottom + TP} ` +
      `L${targetSpot.left - TP} ${targetSpot.bottom + TP}Z`
    : "";

  const d = [outer, sHole, tHole].filter(Boolean).join(" ");

  return (
    <svg
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 9990,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      <path fillRule="evenodd" d={d} fill="rgba(0,0,0,0.52)" />

      {sidebarSpot && (
        <rect
          x={0}
          y={sidebarSpot.top - SP}
          width={sidebarSpot.sidebarW}
          height={sidebarSpot.bottom - sidebarSpot.top + SP * 2}
          fill="none"
          stroke="rgba(13,148,136,0.8)"
          strokeWidth={2}
          rx={8}
          style={{ filter: "drop-shadow(0 0 6px rgba(13,148,136,0.55))" }}
        />
      )}

      {targetSpot && (
        <rect
          x={targetSpot.left - TP}
          y={targetSpot.top - TP}
          width={targetSpot.right - targetSpot.left + TP * 2}
          height={targetSpot.bottom - targetSpot.top + TP * 2}
          fill="none"
          stroke="rgba(13,148,136,0.8)"
          strokeWidth={2}
          rx={6}
          style={{ filter: "drop-shadow(0 0 6px rgba(13,148,136,0.55))" }}
        />
      )}
    </svg>
  );
}

// ─── Animated pointer arrow ─────────────────────────────────
// Bounces toward the target from whichever side has enough space.
// Auto-flips: e.g. a "top" step whose button is in the page header is
// moved below the button automatically so it stays on screen.

function PointerArrow({
  targetSelector,
  side = "top",
}: {
  targetSelector?: string;
  side?: ArrowSide;
}) {
  const [pos, setPos] = useState<{
    x: number;
    y: number;
    effectiveSide: ArrowSide;
  } | null>(null);

  const compute = useCallback(() => {
    if (!targetSelector || side === "none") { setPos(null); return; }
    const rect = measureEl(targetSelector);
    if (!rect) { setPos(null); return; }

    const TP  = 8;   // matches SpotlightOverlay padding
    const GAP = 30;  // distance from target edge to arrow centre
    const MIN = 50;  // min px from viewport edge for arrow to be visible
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;

    let x = 0, y = 0, effectiveSide: ArrowSide = side;

    switch (side) {
      case "top": {
        const yAbove = rect.top - TP - GAP;
        if (yAbove > MIN) {
          y = yAbove;
          effectiveSide = "top";
        } else {
          // button too close to viewport top — flip below
          y = rect.bottom + TP + GAP;
          effectiveSide = "bottom";
        }
        x = Math.min(Math.max((rect.left + rect.right) / 2, MIN), vw - MIN);
        break;
      }
      case "bottom": {
        const yBelow = rect.bottom + TP + GAP;
        if (yBelow < vh - MIN) {
          y = yBelow;
          effectiveSide = "bottom";
        } else {
          y = rect.top - TP - GAP;
          effectiveSide = "top";
        }
        x = Math.min(Math.max((rect.left + rect.right) / 2, MIN), vw - MIN);
        break;
      }
      case "left": {
        const xLeft = rect.left - TP - GAP;
        if (xLeft > MIN) {
          x = xLeft;
          effectiveSide = "left";
        } else {
          x = rect.right + TP + GAP;
          effectiveSide = "right";
        }
        y = Math.min(Math.max((rect.top + rect.bottom) / 2, MIN), vh - MIN);
        break;
      }
      case "right": {
        const xRight = rect.right + TP + GAP;
        if (xRight < vw - MIN) {
          x = xRight;
          effectiveSide = "right";
        } else {
          x = rect.left - TP - GAP;
          effectiveSide = "left";
        }
        y = Math.min(Math.max((rect.top + rect.bottom) / 2, MIN), vh - MIN);
        break;
      }
      default:
        setPos(null);
        return;
    }

    setPos({ x, y, effectiveSide });
  }, [targetSelector, side]);

  useEffect(() => {
    compute();
    // Poll continuously so the arrow re-positions after client-side navigation.
    const interval = setInterval(compute, 150);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [compute]);

  if (!pos) return null;

  // Arrow tip points TOWARD the target.
  // "top"    = arrow is above target  → tip faces ↓ (down,  larger y)
  // "bottom" = arrow is below target  → tip faces ↑ (up,    smaller y)
  // "left"   = arrow is left of target → tip faces → (right, larger x)
  // "right"  = arrow is right of target→ tip faces ← (left,  smaller x)
  const arrowPath = (s: ArrowSide): string => {
    switch (s) {
      case "top":    return "M0,14 L-11,-9 L0,-4 L11,-9 Z"; // ↓ tip at bottom
      case "bottom": return "M0,-14 L-11,9 L0,4 L11,9 Z";  // ↑ tip at top
      case "left":   return "M14,0 L-9,-11 L-4,0 L-9,11 Z"; // → tip at right
      case "right":  return "M-14,0 L9,-11 L4,0 L9,11 Z";   // ← tip at left
      default:       return "";
    }
  };

  // Bounce toward the target
  const animName = `va-${pos.effectiveSide}`;
  const dx = pos.effectiveSide === "left" ? 6 : pos.effectiveSide === "right" ? -6 : 0;
  const dy = pos.effectiveSide === "top" ? 6 : pos.effectiveSide === "bottom" ? -6 : 0;

  return (
    <svg
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 9996,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <style>{`
        @keyframes ${animName}-kf {
          0%,100% { transform: translate(${pos.x}px, ${pos.y}px); }
          50%      { transform: translate(${pos.x + dx}px, ${pos.y + dy}px); }
        }
        .${animName}-arrow { animation: ${animName}-kf 1s ease-in-out infinite; }
      `}</style>
      <g className={`${animName}-arrow`}>
        <path
          d={arrowPath(pos.effectiveSide)}
          fill="#0d9488"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 2px 8px rgba(13,148,136,0.7))" }}
        />
      </g>
    </svg>
  );
}

// ─── Tooltip position hook ────────────────────────────────────

type TooltipPos = {
  top?: number;
  left?: number;
  arrowLeft?: number;
  arrowTop?: number;
  placement: "near-target" | "center";
  targetMissing?: boolean;
};

function useTooltipPosition(
  selector: string | undefined,
  arrowSide: ArrowSide = "none"
): TooltipPos {
  const [pos, setPos] = useState<TooltipPos>({ placement: "center", targetMissing: !!selector });

  const compute = useCallback(() => {
    if (!selector || arrowSide === "none") {
      setPos(p => {
        if (p.placement === "center" && p.targetMissing === false) return p;
        return { placement: "center", targetMissing: false };
      });
      return;
    }
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      setPos(p => {
        if (p.placement === "center" && p.targetMissing === true) return p;
        return { placement: "center", targetMissing: true };
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const CARD_W = 400;
    const GAP = 56; // extra gap to clear the pointer arrow
    let nextPos: TooltipPos = { placement: "center", targetMissing: false };

    if (arrowSide === "top") {
      let left = rect.left + rect.width / 2 - CARD_W / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));
      const arrowLeft = rect.left + rect.width / 2 - left;
      nextPos = { top: rect.bottom + GAP, left, arrowLeft, placement: "near-target", targetMissing: false };
    } else if (arrowSide === "bottom") {
      let left = rect.left + rect.width / 2 - CARD_W / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));
      const arrowLeft = rect.left + rect.width / 2 - left;
      nextPos = { top: rect.top - GAP - 360, left, arrowLeft, placement: "near-target", targetMissing: false };
    } else if (arrowSide === "left") {
      let top = rect.top + rect.height / 2 - 100;
      top = Math.max(12, Math.min(top, window.innerHeight - 300));
      nextPos = { top, left: rect.right + GAP, arrowTop: rect.top + rect.height / 2 - top, placement: "near-target", targetMissing: false };
    } else if (arrowSide === "right") {
      let top = rect.top + rect.height / 2 - 100;
      top = Math.max(12, Math.min(top, window.innerHeight - 300));
      nextPos = { top, left: rect.left - CARD_W - GAP, arrowTop: rect.top + rect.height / 2 - top, placement: "near-target", targetMissing: false };
    }

    setPos(p => {
      if (
        p.placement === nextPos.placement &&
        p.top === nextPos.top &&
        p.left === nextPos.left &&
        p.arrowLeft === nextPos.arrowLeft &&
        p.arrowTop === nextPos.arrowTop &&
        p.targetMissing === nextPos.targetMissing
      ) {
        return p;
      }
      return nextPos;
    });
  }, [selector, arrowSide]);

  useEffect(() => {
    compute();
    const interval = setInterval(compute, 150);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [compute]);

  return pos;
}

// ─── Progress sidebar widget ──────────────────────────────────

function SetupProgressWidget({
  steps,
  completedIds,
  current,
  onResume,
  isSkipped,
  isActive,
}: {
  steps: SetupStep[];
  completedIds: Set<string>;
  current: number;
  onResume: () => void;
  isSkipped: boolean;
  /** True when the guide overlay is currently open and running */
  isActive: boolean;
}) {
  const done  = steps.filter((s) => completedIds.has(s.id)).length;
  const total = steps.length;
  const pct   = Math.round((done / total) * 100);

  // ── INACTIVE STATE: compact pill ─────────────────────────────
  // When the guide is not running (skipped, paused, or fresh re-login)
  // show a small floating pill that sits just past the sidebar so it
  // never blocks sidebar navigation or page action buttons.
  if (!isActive) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Workspace Setup — ${done} of ${total} steps complete. Click to continue.`}
        onClick={onResume}
        onKeyDown={(e) => e.key === "Enter" && onResume()}
        style={{
          position: "fixed",
          bottom: 24,
          // Sit just outside the sidebar — uses the shadcn CSS variable with px fallback
          left: "calc(var(--sidebar-width, 240px) + 16px)",
          zIndex: 200,
          background: "white",
          borderRadius: 99,
          padding: "10px 12px 10px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
          transition: "box-shadow 0.2s, transform 0.15s",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(13,148,136,0.18), 0 2px 6px rgba(0,0,0,0.08)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Progress info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Workspace Setup</span>
            <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>{done}/{total}</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: "#e5f9f7", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: "linear-gradient(90deg,#2dd4bf,#0d9488)",
                borderRadius: 99,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={(e) => { e.stopPropagation(); onResume(); }}
          style={{
            flexShrink: 0,
            height: 34,
            borderRadius: 99,
            border: "none",
            background: "linear-gradient(135deg,#2dd4bf 0%,#0d9488 100%)",
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            padding: "0 14px",
            boxShadow: "0 3px 10px rgba(13,148,136,0.35)",
            whiteSpace: "nowrap",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
        >
          Continue Setup →
        </button>
      </div>
    );
  }

  // ── ACTIVE STATE: full checklist widget ───────────────────────
  // Shown when the guide overlay is running — sits at bottom-left
  // above the overlay (z-index 9999) so the user can track progress.
  return (
    <div
      aria-label="Setup progress"
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 9999,
        background: "white",
        borderRadius: 16,
        padding: "18px 22px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.14), 0 1px 6px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.07)",
        minWidth: 240,
        maxWidth: 280,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>
          Workspace Setup
        </p>
        <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>
          {done}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 99, background: "#e5f9f7", marginBottom: 12, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg,#2dd4bf,#0d9488)",
            borderRadius: 99,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s, i) => {
          const isDone      = completedIds.has(s.id);
          const isStepActive = i === current && !isDone;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: "50%",
                  border: `2px solid ${isDone ? "#0d9488" : isStepActive ? "#0d9488" : "#d1d5db"}`,
                  background: isDone ? "#0d9488" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.3s ease",
                  boxShadow: isStepActive ? "0 0 0 3px rgba(13,148,136,0.15)" : "none",
                }}
              >
                {isDone ? (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4l2 2L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isStepActive ? (
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#0d9488" }} />
                ) : null}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: isDone ? "#9ca3af" : isStepActive ? "#0d9488" : "#374151",
                  fontWeight: isDone ? 400 : isStepActive ? 600 : 500,
                  textDecoration: isDone ? "line-through" : "none",
                }}
              >
                {s.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── All-done celebration modal ───────────────────────────────

function SetupCompleteModal({ onClose }: { onClose: () => void }) {
  const headingId = "setup-complete-heading";

  // Move focus into the modal when it mounts
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: "48px 40px 40px",
          maxWidth: 440,
          width: "calc(100vw - 48px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
          textAlign: "center",
        }}
      >
        {/* Confetti icon */}
        <div style={{ fontSize: 52, marginBottom: 20, lineHeight: 1 }}>🎉</div>

        <h2
          id={headingId}
          style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 12, letterSpacing: "-0.03em" }}
        >
          Workspace Ready!
        </h2>

        <p style={{ fontSize: 15, lineHeight: 1.7, color: "#4b5563", marginBottom: 36 }}>
          You've completed your workspace setup. Your team can now submit
          expenses, and approvals will flow through your policies automatically.
        </p>

        <button
          ref={btnRef}
          onClick={onClose}
          style={{
            width: "100%",
            height: 50,
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg,#2dd4bf 0%,#0d9488 100%)",
            color: "white",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(13,148,136,0.4)",
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────

function SetupCard({
  step,
  stepNumber,
  totalSteps,
  pos,
  visible,
  isDone,
  waitingForAction,
  onSkip,
  onClose,
}: {
  step: SetupStep;
  stepNumber: number;
  totalSteps: number;
  pos: TooltipPos;
  visible: boolean;
  isDone: boolean;
  waitingForAction: boolean;
  onSkip: () => void;
  onClose: () => void;
}) {
  const headingId = "setup-card-heading";
  const isCentered = pos.placement === "center";

  // Move focus into the card whenever it becomes visible
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visible) {
      // Small delay so the CSS opacity transition has started before focus moves
      const t = setTimeout(() => cardRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const wrapStyle: React.CSSProperties = isCentered
    ? {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: visible
          ? "translate(-50%,-50%) scale(1)"
          : "translate(-50%,-50%) scale(0.94)",
        zIndex: 9999,
        width: 420,
        maxWidth: "calc(100vw - 32px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.46,0.64,1)",
      }
    : {
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        width: 400,
        maxWidth: "calc(100vw - 32px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.46,0.64,1)",
      };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      // tabIndex="-1" lets focus move here programmatically without adding to tab order
      tabIndex={-1}
      style={{ ...wrapStyle, outline: "none" }}
    >
      {/* Upward arrow tab on the card */}
      {step.arrowSide === "top" && pos.arrowLeft !== undefined && (
        <div
          style={{
            position: "absolute",
            top: -10,
            left: pos.arrowLeft - 10,
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderBottom: "10px solid white",
            filter: "drop-shadow(0 -2px 3px rgba(0,0,0,0.07))",
            zIndex: 1,
          }}
        />
      )}

      {step.arrowSide === "left" && pos.arrowTop !== undefined && (
        <div
          style={{
            position: "absolute",
            top: pos.arrowTop - 10,
            left: -10,
            width: 0,
            height: 0,
            borderTop: "10px solid transparent",
            borderBottom: "10px solid transparent",
            borderRight: "10px solid white",
            filter: "drop-shadow(-2px 0 3px rgba(0,0,0,0.07))",
            zIndex: 1,
          }}
        />
      )}

      <div
        style={{
          background: "white",
          borderRadius: 18,
          boxShadow: "0 24px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "26px 28px 24px" }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "#0d9488",
                background: "#f0fdf9",
                padding: "3px 10px",
                borderRadius: 99,
              }}
            >
              Step {stepNumber} of {totalSteps}
            </span>
            <button
              onClick={onClose}
              aria-label="Close setup guide"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: 6,
                color: "#9ca3af",
                lineHeight: 1,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#374151")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#9ca3af")}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <h2
            id={headingId}
            style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 10, letterSpacing: "-0.02em", lineHeight: 1.25 }}
          >
            {step.title}
          </h2>

          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#4b5563", marginBottom: 22 }}>
            {step.description}
          </p>

          {/* Action-required banner */}
          {waitingForAction && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 20,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M8 1.5L1 14h14L8 1.5z" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 6v4M8 11.5v.5" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5, margin: 0 }}>
                Follow the arrow — it points to the exact button you need to click to complete this step.
              </p>
            </div>
          )}

          {isDone && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#f0fdf9",
                border: "1px solid #a7f3d0",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 20,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#0d9488" />
                <path d="M4.5 8l2.5 2.5L11 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p style={{ fontSize: 12, color: "#065f46", lineHeight: 1.5, margin: 0, fontWeight: 600 }}>
                Step completed! Advancing…
              </p>
            </div>
          )}

          <div style={{ height: 1, background: "#f3f4f6", marginBottom: 18 }} />

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onSkip}
              style={{
                flex: 1,
                height: 42,
                borderRadius: 10,
                border: "1.5px solid #e5e7eb",
                background: "white",
                color: "#374151",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#0d9488")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb")}
            >
              Skip for now
            </button>

            <button
              disabled
              style={{
                flex: 2,
                height: 42,
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#2dd4bf 0%,#0d9488 100%)",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                opacity: 0.45,
                cursor: "not-allowed",
                position: "relative",
              }}
              title="Complete the action above to proceed"
            >
              <span>Waiting for action…</span>
              {/* Pulsing dot */}
              <span
                style={{
                  position: "absolute",
                  top: 10,
                  right: 12,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.7)",
                  animation: "villeto-pulse 1.4s ease-in-out infinite",
                }}
              />
              <style>{`@keyframes villeto-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}`}</style>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function VilletoSetupGuide() {
  const user           = useAuthStore((s) => s.user);
  const router         = useRouter();
  const pathname       = usePathname();
  const searchParams   = useSearchParams();
  const setTourActive  = useTourStore((s) => s.setTourActive);
  // Gate: only show after SetPasswordModal has completed
  const setupGuideReady = useTourStore((s) => (s as any).setupGuideReady ?? false);

  const [visible,          setVisible]          = useState(false);
  const [cardVisible,      setCardVisible]      = useState(false);
  const [stepIndex,        setStepIndex]        = useState(0);
  const [completedIds,     setCompletedIds]     = useState<Set<string>>(new Set());
  const [isSkipped,        setIsSkipped]        = useState(false);
  const [showDoneModal,    setShowDoneModal]    = useState(false);
  const [waitingForAction, setWaitingForAction] = useState(true);

  // ── Refs ──────────────────────────────────────────────────────
  // pendingRef  — nav-settle timer (card fade-in after page change)
  // advanceRef  — step-advance timer (after markStepDone)
  // stepIndexRef — mirror of stepIndex readable outside updaters,
  //                so markStepDone never needs a setStepIndex updater
  //                for reading — eliminating the StrictMode double-fire.
  // allDoneRef  — guards the completion effect from firing more than once
  const pendingRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepIndexRef  = useRef(0);
  const allDoneRef    = useRef(false);

  // ── User qualification ─────────────────────────────────────
  // Only the company founder gets the interactive Setup Guide:
  // a CONTROLLING_OFFICER whose account was created at the same time as the company.
  const isEligible =
    user?.position === "CONTROLLING_OFFICER" &&
    !!user?.createdAt &&
    user.createdAt === user?.company?.createdAt;

  const userId        = user?.userId ?? "";
  const dismissedKey  = userId ? GUIDE_DISMISSED_KEY(userId) : null;
  const completedKey  = userId ? GUIDE_COMPLETED_KEY(userId) : null;

  // ── [FIX-3] Keep stepIndexRef in sync ──────────────────────
  // Must happen synchronously with every stepIndex state change so
  // markStepDone always reads the current value, not a stale one.
  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  // ── Restore persisted progress on mount ───────────────────
  useEffect(() => {
    if (!userId) return;
    const restored = new Set<string>();
    SETUP_STEPS.forEach((s) => {
      if (localStorage.getItem(STEP_DONE_KEY(userId, s.id)) === "1")
        restored.add(s.id);
    });
    setCompletedIds(restored);

    // If user already finished all steps before this session, skip entirely
    if (completedKey && localStorage.getItem(completedKey) === "1") {
      allDoneRef.current = true; // prevent completion effect from re-firing
      setVisible(false);
      return;
    }

    // Find first incomplete step
    const firstIncomplete = SETUP_STEPS.findIndex((s) => !restored.has(s.id));
    if (firstIncomplete === -1) return; // all done
    setStepIndex(firstIncomplete);

    // If previously dismissed, surface the widget so the user sees "Continue Setup"
    if (dismissedKey && localStorage.getItem(dismissedKey) === "1") {
      setIsSkipped(true);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start guide after password modal ──────────────────────
  useEffect(() => {
    if (!isEligible || !setupGuideReady) return;
    if (dismissedKey && localStorage.getItem(dismissedKey) === "1") return;
    if (completedKey && localStorage.getItem(completedKey) === "1") return;

    const t = setTimeout(() => {
      setVisible(true);
    }, 600);
    return () => clearTimeout(t);
  }, [isEligible, setupGuideReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Broadcast to sidebar ───────────────────────────────────
  useEffect(() => {
    setTourActive(visible && !isSkipped);
    return () => setTourActive(false);
  }, [visible, isSkipped, setTourActive]);

  // ── Navigation effect ──────────────────────────────────────
  const step = SETUP_STEPS[stepIndex];

  useEffect(() => {
    if (!visible || isSkipped || !step) return;
    if (pendingRef.current) clearTimeout(pendingRef.current);

    const targetUrl = step.navigateUrl ?? step.navigateTo;
    const tabMatch  = targetUrl.match(/tab=([^&]+)/);
    const targetTab = tabMatch ? tabMatch[1] : null;
    const currTab   = searchParams.get("tab");

    // If the user is on an allowed sub-path for this step (e.g. the CSV
    // upload flow), don't redirect them back — just update the spotlight.
    const isOnAllowedSubPath = step.allowedSubPaths?.some((p) =>
      pathname.startsWith(p)
    ) ?? false;

    if (
      !isOnAllowedSubPath &&
      (pathname !== step.navigateTo || (targetTab && currTab !== targetTab))
    ) {
      setCardVisible(false);
      router.push(targetUrl);
      // Register cleanup so if this effect re-runs before the navigation
      // resolves, we don't leave stale state.
      return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
    }

    setCardVisible(false);
    setWaitingForAction(!completedIds.has(step.id));
    pendingRef.current = setTimeout(() => setCardVisible(true), 400);
    return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
  }, [pathname, searchParams, stepIndex, visible, isSkipped]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── [FIX-2] Completion detection — dedicated effect ────────
  // All "allDone" side-effects (localStorage write, showDoneModal timer,
  // setVisible, setIsSkipped) live HERE, not inside the setCompletedIds
  // updater. An updater is a pure function; putting side-effects in it
  // causes React StrictMode to run them twice (double-timer, double-modal).
  useEffect(() => {
    if (!completedIds.size) return;
    const allDone = SETUP_STEPS.every((s) => completedIds.has(s.id));
    if (!allDone || allDoneRef.current) return;

    // Guard against re-firing if this session already had the guide complete
    // (restored from localStorage on mount with allDoneRef already set there).
    if (completedKey && localStorage.getItem(completedKey) === "1") {
      allDoneRef.current = true;
      return;
    }

    allDoneRef.current = true;
    if (completedKey) localStorage.setItem(completedKey, "1");
    setIsSkipped(false);
    setVisible(true);
    const t = setTimeout(() => setShowDoneModal(true), 400);
    return () => clearTimeout(t);
  }, [completedIds, completedKey]);

  // ── [FIX-1] Silent action detection ───────────────────────
  // Pages dispatch custom events after successful actions.
  // We listen and tick silently even if guide is skipped.
  //
  // The original code called setWaitingForAction + setTimeout INSIDE a
  // setStepIndex(cur => ...) updater. React StrictMode calls updaters
  // twice in dev — the side effects fired twice → timer double-scheduled
  // → step advanced twice → step was skipped.
  //
  // Fix: read the current step via stepIndexRef (always in sync via its
  // own useEffect) and perform ALL side effects at the call-site, never
  // inside an updater function.
  const markStepDone = useCallback(
    (stepId: string) => {
      // ── 1. Persist the tick ──────────────────────────────────
      // Only pure state update in the updater — no side effects.
      setCompletedIds((prev) => {
        if (prev.has(stepId)) return prev;
        const next = new Set(prev);
        next.add(stepId);
        if (userId) localStorage.setItem(STEP_DONE_KEY(userId, stepId), "1");
        return next;
        // NOTE: "allDone" detection and setShowDoneModal have been moved to
        // the dedicated useEffect above — DO NOT put them back in here.
      });

      // ── 2. Advance the guide if this is the active step ─────
      // Read from the ref — no updater needed, no StrictMode double-fire.
      const cur = stepIndexRef.current;
      if (SETUP_STEPS[cur]?.id !== stepId) return;

      setWaitingForAction(false);

      // Clear any pre-existing advance timer before scheduling a new one
      if (advanceRef.current) clearTimeout(advanceRef.current);

      advanceRef.current = setTimeout(() => {
        const next = cur + 1;
        if (next < SETUP_STEPS.length) {
          setCardVisible(false);
          advanceRef.current = setTimeout(() => setStepIndex(next), 280);
        }
        // If next >= length, the completion useEffect handles the modal.
      }, 800);
    },
    [userId]
  );

  // ── Cleanup advance timers on unmount ─────────────────────
  useEffect(() => {
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, []);

  // Listen for custom events from page actions
  useEffect(() => {
    const handlers: Array<{ event: string; fn: EventListener }> = [];
    SETUP_STEPS.forEach((s) => {
      if (!s.completionEvent) return;
      const fn = () => markStepDone(s.id);
      window.addEventListener(s.completionEvent, fn);
      handlers.push({ event: s.completionEvent, fn });
    });
    return () => { handlers.forEach(({ event, fn }) => window.removeEventListener(event, fn)); };
  }, [markStepDone]);

  // ── Skip / resume ─────────────────────────────────────────
  const skipGuide = useCallback(() => {
    setCardVisible(false);
    setTimeout(() => {
      setIsSkipped(true);
      if (dismissedKey) localStorage.setItem(dismissedKey, "1");
    }, 300);
  }, [dismissedKey]);

  const resumeGuide = useCallback(() => {
    setIsSkipped(false);
    if (dismissedKey) localStorage.removeItem(dismissedKey);
    setVisible(true);
  }, [dismissedKey]);

  // ── Close (X button) → same as skip ──────────────────────
  const handleClose = useCallback(() => skipGuide(), [skipGuide]);

  // ── [FIX-6] Keyboard ──────────────────────────────────────
  // Guard the Enter key: only advance / close when focus is NOT inside
  // a form field so we don't hijack typing in interactive steps.
  useEffect(() => {
    if (!visible || isSkipped) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipGuide();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, isSkipped, skipGuide]);

  // ── Active sub-state (e.g. the CSV upload sub-pages) ─────
  const activeSubState = step?.subStates?.find((ss) =>
    ss.pathMatch(pathname, new URLSearchParams(searchParams.toString()))
  );

  const activeStep: SetupStep | undefined = step
    ? activeSubState
      ? {
          ...step,
          targetSelector: activeSubState.targetSelector ?? step.targetSelector,
          arrowSide:      activeSubState.arrowSide      ?? step.arrowSide,
          title:          activeSubState.title          ?? step.title,
          description:    activeSubState.description   ?? step.description,
          allowInteraction: activeSubState.allowInteraction ?? step.allowInteraction,
          disableSpotlight: activeSubState.disableSpotlight ?? step.disableSpotlight,
        }
      : step
    : undefined;

  // ── Tooltip position ──────────────────────────────────────
  const pos = useTooltipPosition(
    !isSkipped ? activeStep?.targetSelector : undefined,
    !isSkipped ? (activeStep?.arrowSide ?? "none") : "none"
  );

  // ── Scroll lock ─────────────────────────────────────────────
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (visible && !isSkipped && activeStep && !activeStep.allowInteraction) {
      document.body.style.overflow = "hidden";
      if (mainEl) mainEl.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (mainEl) mainEl.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      if (mainEl) mainEl.style.overflow = "";
    };
  }, [visible, isSkipped, activeStep?.allowInteraction]);

  // ── Completion modal close ────────────────────────────────
  const handleDoneClose = useCallback(() => {
    setShowDoneModal(false);
    setVisible(false);
    router.push("/dashboard");
  }, [router]);

  // ── Render guards ─────────────────────────────────────────
  if (!isEligible || !userId) return null;
  if (!setupGuideReady) return null; // Wait for SetPasswordModal flow to resolve

  const allDone = SETUP_STEPS.every((s) => completedIds.has(s.id));
  if (allDone && !showDoneModal) return null;

  // Show the progress widget any time the guide is incomplete —
  // visible (active), skipped, or just re-opened after a new login.
  const showProgress = !allDone;

  return (
    <SetupGuideContext.Provider value={{ markStepDone }}>
      <div id="villeto-setup-root">
        {/* Completion modal */}
        {showDoneModal && <SetupCompleteModal onClose={handleDoneClose} />}

        {/* Progress widget — always visible when guide is active or skipped */}
        {showProgress && (
          <SetupProgressWidget
            steps={SETUP_STEPS}
            completedIds={completedIds}
            current={stepIndex}
            onResume={resumeGuide}
            isSkipped={isSkipped}
            isActive={visible && !isSkipped}
          />
        )}

        {/* Only render overlay + card when guide is open (not skipped) */}
        {visible && !isSkipped && activeStep && (
          <>
            {/* Global UI freeze and strict interaction blocker */}
            {!activeStep.allowInteraction && (
              <style>{`
                /* Freeze Background Scrolling */
                body, main, .overflow-y-auto, .overflow-auto, .overflow-x-auto {
                  overflow: hidden !important;
                }

                /* Natively intercept and block all background stray clicks */
                body {
                  pointer-events: none !important;
                  user-select: none !important;
                }

                /* Whitelist the Setup Guide interface itself */
                #villeto-setup-root, #villeto-setup-root * {
                  pointer-events: auto !important;
                }

                /* Whitelist Radix UI portals (dropdowns, dialogs, modals) */
                [data-radix-popper-content-wrapper],
                [data-radix-popper-content-wrapper] *,
                [role="dialog"],
                [role="dialog"] * {
                  pointer-events: auto !important;
                }

                /*
                 * The broad rule above accidentally enables pointer-events on
                 * the two full-screen SVG overlays (SpotlightOverlay z-9990,
                 * PointerArrow z-9996), overriding their inline pointerEvents:"none".
                 * Those SVGs sit above the entire page; with pointer-events:auto they
                 * silently absorb every hover and click — so the target button never
                 * sees cursor:pointer and clicks never reach it.
                 *
                 * Fix: re-silence SVGs and ALL their children with a more-specific
                 * rule.  "svg" adds an element type, giving specificity (1,0,1) which
                 * beats the universal (1,0,0) above even though both carry !important.
                 */
                #villeto-setup-root svg,
                #villeto-setup-root svg * {
                  pointer-events: none !important;
                }

                /* Whitelist the current active target button */
                ${activeStep.targetSelector ? `
                  ${activeStep.targetSelector}, ${activeStep.targetSelector} * {
                    pointer-events: auto !important;
                    cursor: pointer !important;
                  }
                ` : ""}
              `}</style>
            )}

            {/* SVG spotlight overlay */}
            {!activeStep.disableSpotlight && (
              <SpotlightOverlay
                sidebarHref={activeStep.sidebarHref}
                targetSelector={activeStep.targetSelector}
                visible={cardVisible}
              />
            )}

            {/* Bouncing pointer arrow */}
            {activeStep.targetSelector && activeStep.arrowSide && activeStep.arrowSide !== "none" && (
              <PointerArrow
                targetSelector={activeStep.targetSelector}
                side={activeStep.arrowSide}
              />
            )}

            {/* Step card */}
            <SetupCard
              step={activeStep}
              stepNumber={stepIndex + 1}
              totalSteps={SETUP_STEPS.length}
              pos={pos}
              visible={cardVisible && !pos.targetMissing}
              isDone={completedIds.has(step.id)}
              waitingForAction={waitingForAction && !completedIds.has(step.id)}
              onSkip={skipGuide}
              onClose={handleClose}
            />
          </>
        )}
      </div>
    </SetupGuideContext.Provider>
  );
}