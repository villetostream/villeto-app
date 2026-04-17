"use client";

/**
 * VilletoTourGuide
 * ─────────────────────────────────────────────────────────────
 * First-login workspace tour for ALL users EXCEPT those who see
 * the SetupGuide (CONTROLLING_OFFICER / ORGANIZATION_OWNER on
 * their very first login, who get the interactive Setup Guide
 * instead via VilletoSetupGuide).
 *
 * Bug-fixes applied (see CHANGELOG below):
 *  [FIX-1] SpotlightOverlay — replaced single requestAnimationFrame
 *          with setInterval(measure, 150) + scroll listener.
 *          A single rAF fires once (~16ms after mount) and never
 *          again, so after client-side navigation the spotlight
 *          hole never re-measured and stayed at the wrong position.
 *  [FIX-2] PointerArrow — same fix: rAF → setInterval(150).
 *  [FIX-3] useTooltipPosition — same fix: rAF → setInterval(150),
 *          plus the missing scroll capture listener that SetupGuide
 *          has but TourGuide was missing.
 *  [FIX-4] Start-tour effect — replaced requestAnimationFrame for
 *          setCardVisible(true) with a small setTimeout so the card
 *          appears after the DOM has settled, not just one paint tick.
 *  [FIX-5] advance() — replaced stepIndex closure with stepIndexRef
 *          so rapid navigation or StrictMode double-invocation cannot
 *          produce a stale index read. stepIndex removed from the
 *          useCallback deps, eliminating the keyboard-listener
 *          tear-down/re-attach on every step change.
 *  [FIX-6] Navigation effect — the router.push branch now explicitly
 *          registers a cleanup function so any pending settle timer is
 *          cancelled if the effect re-runs before navigation resolves.
 *  [FIX-7] TourCard — added role="dialog", aria-modal, aria-labelledby
 *          and programmatic focus management for screen-reader
 *          accessibility (enterprise readiness).
 *  [FIX-8] Keyboard handler — Enter key now checks the focused element
 *          tag so it doesn't advance the tour while the user is typing
 *          in the interactive Account Details form.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-stores";
import { Roles } from "@/core/permissions/roles";
import { useTourStore } from "@/stores/useTourStore";

// ─── Types ────────────────────────────────────────────────────

type ArrowSide = "top" | "bottom" | "left" | "right" | "none";

type TourStep = {
  id: string;
  navigateTo: string;
  navigateUrl?: string;
  sidebarHref?: string;
  targetSelector?: string;
  arrowSide?: ArrowSide;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref?: string;
  secondaryLabel?: string;
  roles?: string[];
  requiredPermission?: string;
  progressLabel?: string;
  /** When true, the target element's pointer-events are NOT blocked so users
   * can interact with it directly during this step (used for Account Details). */
  targetIsInteractive?: boolean;
};

// ─── Step Definitions ─────────────────────────────────────────

const ALL_STEPS: TourStep[] = [
  // 0 — Welcome
  {
    id: "welcome",
    navigateTo: "/dashboard",
    sidebarHref: "/dashboard",
    arrowSide: "none",
    title: "Welcome to Villeto",
    description:
      "Welcome to Villeto. Let's walk you through the key areas of your workspace so you can hit the ground running.",
    primaryLabel: "Start Tour",
    secondaryLabel: "Skip Tour",
    roles: [Roles.CONTROLLING_OFFICER, Roles.ORGANIZATION_OWNER],
  },

  // 1 — Upload Directory
  {
    id: "directory",
    navigateTo: "/people",
    navigateUrl: "/people?tab=directory",
    sidebarHref: "/people",
    targetSelector: '[data-tour="upload-directory-button"]',
    arrowSide: "top",
    title: "Upload Employee Directory",
    description:
      "This is where you upload your employee directory. Click \"Upload Directory\" to import your team's names, emails, and departments.",
    primaryLabel: "Next",
    secondaryLabel: "Skip Tour",
    progressLabel: "Directory upload",
    roles: [Roles.CONTROLLING_OFFICER, Roles.ORGANIZATION_OWNER, Roles.FINANCE_ADMIN],
    requiredPermission: "read:users",
  },

  // 2 — Send Invitations
  {
    id: "invitations",
    navigateTo: "/people",
    navigateUrl: "/people?tab=all-users",
    sidebarHref: "/people",
    targetSelector: '[data-tour="invite-button"]',
    arrowSide: "top",
    title: "Invite Users",
    description:
      "Use the \"Invite Users\" button to send invitations to employees and leadership. They'll receive an email with a link to join your workspace.",
    primaryLabel: "Next",
    secondaryLabel: "Skip Tour",
    progressLabel: "Invitations sent",
    roles: [Roles.CONTROLLING_OFFICER, Roles.ORGANIZATION_OWNER, Roles.FINANCE_ADMIN],
    requiredPermission: "read:users",
  },

  // 3 — Expense Categories
  {
    id: "expense-category",
    navigateTo: "/policies",
    navigateUrl: "/policies?tab=expense",
    sidebarHref: "/policies",
    targetSelector: '[data-tour="new-expense-category-button"]',
    arrowSide: "top",
    title: "Expense Categories",
    description:
      "Expense categories (Travel, Meals, Software, etc.) power your approval policies. The \"New Expense Category\" button is how you add them.",
    primaryLabel: "Next",
    secondaryLabel: "Skip Tour",
    progressLabel: "Expense category",
    roles: [Roles.CONTROLLING_OFFICER, Roles.ORGANIZATION_OWNER, Roles.FINANCE_ADMIN],
    requiredPermission: "expense_policies:read",
  },

  // 4 — Policies
  {
    id: "policies",
    navigateTo: "/policies",
    navigateUrl: "/policies?tab=policies",
    sidebarHref: "/policies",
    targetSelector: '[data-tour="new-policy-button"]',
    arrowSide: "top",
    title: "Policies",
    description:
      "Policies define spend limits, receipt requirements, and approval chains. Tap \"New Policy\" when you're ready to configure your first rule.",
    primaryLabel: "Next",
    secondaryLabel: "Skip Tour",
    progressLabel: "Policy",
    roles: [Roles.CONTROLLING_OFFICER, Roles.ORGANIZATION_OWNER, Roles.FINANCE_ADMIN],
    requiredPermission: "expense_policies:read",
  },

  // 5 — Account Details (interactive — users can fill this in now)
  {
    id: "account-details",
    navigateTo: "/settings/personal-settings",
    navigateUrl: "/settings/personal-settings?section=account-details",
    sidebarHref: "/settings",
    targetSelector: '[data-tour="account-details-section"]',
    arrowSide: "top",
    title: "Your Account Details",
    description:
      "Add your bank details here so reimbursements are paid directly to you. Your name must match the company directory — a mismatch will show an error. Feel free to fill this in now!",
    primaryLabel: "Next",
    secondaryLabel: "Skip Tour",
    progressLabel: "Account details",
    targetIsInteractive: true, // let the form be used during this step
  },

  // 6 — Setup Complete
  {
    id: "setup-complete",
    navigateTo: "/expenses",
    sidebarHref: "/expenses",
    targetSelector: 'a[href="/expenses"]',
    arrowSide: "left",
    title: "You're All Set!",
    description:
      "That's the tour! You can now manage expenses, approvals, and vendor payments. When you're ready, hit \"Create Expense Report\" to get started.",
    primaryLabel: "Create Expense Report",
    secondaryLabel: "Go to Overview",
  },
];

// ─── Progress tracker items ────────────────────────────────────

const PROGRESS_STEPS = [
  { label: "Directory upload",  stepId: "directory"        },
  { label: "Invitations sent",  stepId: "invitations"      },
  { label: "Expense category",  stepId: "expense-category" },
  { label: "Policy",            stepId: "policies"         },
  { label: "Account details",   stepId: "account-details"  },
];

// ─── Session-storage key ───────────────────────────────────────

const TOUR_KEY = (userId: string) => `villeto-tour-seen:${userId}`;

// ─── Helpers ──────────────────────────────────────────────────

function getRoleString(user: ReturnType<typeof useAuthStore>["user"]): string {
  return (
    user?.villetoRole?.name?.toUpperCase() ||
    user?.position?.toUpperCase() ||
    ""
  );
}

function getFilteredSteps(
  user: ReturnType<typeof useAuthStore>["user"],
  hasPermission: (p: string | string[]) => boolean
): TourStep[] {
  const roleStr = getRoleString(user);
  return ALL_STEPS.filter((step) => {
    if (step.roles?.length) {
      if (!step.roles.includes(roleStr)) return false;
    }
    if (step.requiredPermission) {
      if (!hasPermission(step.requiredPermission)) return false;
    }
    return true;
  });
}

// ─── SVG Spotlight overlay ─────────────────────────────────────

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
  targetIsInteractive,
  visible,
}: {
  sidebarHref?: string;
  targetSelector?: string;
  targetIsInteractive?: boolean;
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
        setSidebarSpot({ top: r.top, bottom: r.bottom, left: 0, right: sw, sidebarW: sw });
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

  // [FIX-1] Replace single requestAnimationFrame with a polling interval.
  // A one-shot rAF fires ~16ms after mount and never again, so after
  // client-side navigation the hole never re-measured and sat at the
  // wrong position until the next resize event.
  useEffect(() => {
    measure();
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
  // Widen the target punch-out for the interactive account details section
  const TPA = targetIsInteractive ? 12 : TP;

  const outer = `M0 0 L${w} 0 L${w} ${h} L0 ${h}Z`;

  const sHole = sidebarSpot
    ? `M0 ${sidebarSpot.top - SP} L${sidebarSpot.sidebarW} ${sidebarSpot.top - SP} ` +
      `L${sidebarSpot.sidebarW} ${sidebarSpot.bottom + SP} L0 ${sidebarSpot.bottom + SP}Z`
    : "";

  const tHole = targetSpot
    ? `M${targetSpot.left - TPA} ${targetSpot.top - TPA} ` +
      `L${targetSpot.right + TPA} ${targetSpot.top - TPA} ` +
      `L${targetSpot.right + TPA} ${targetSpot.bottom + TPA} ` +
      `L${targetSpot.left - TPA} ${targetSpot.bottom + TPA}Z`
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
          x={targetSpot.left - TPA}
          y={targetSpot.top - TPA}
          width={targetSpot.right - targetSpot.left + TPA * 2}
          height={targetSpot.bottom - targetSpot.top + TPA * 2}
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

// ─── Animated bouncing pointer arrow ──────────────────────────
// Auto-flips to the opposite side when the preferred placement would
// render off-screen (e.g. header buttons that sit at the very top).
// Arrow tip always points TOWARD the target element.

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
          y = yAbove; effectiveSide = "top";
        } else {
          // button too close to viewport top — flip below
          y = rect.bottom + TP + GAP; effectiveSide = "bottom";
        }
        x = Math.min(Math.max((rect.left + rect.right) / 2, MIN), vw - MIN);
        break;
      }
      case "bottom": {
        const yBelow = rect.bottom + TP + GAP;
        if (yBelow < vh - MIN) {
          y = yBelow; effectiveSide = "bottom";
        } else {
          y = rect.top - TP - GAP; effectiveSide = "top";
        }
        x = Math.min(Math.max((rect.left + rect.right) / 2, MIN), vw - MIN);
        break;
      }
      case "left": {
        const xLeft = rect.left - TP - GAP;
        if (xLeft > MIN) {
          x = xLeft; effectiveSide = "left";
        } else {
          x = rect.right + TP + GAP; effectiveSide = "right";
        }
        y = Math.min(Math.max((rect.top + rect.bottom) / 2, MIN), vh - MIN);
        break;
      }
      case "right": {
        const xRight = rect.right + TP + GAP;
        if (xRight < vw - MIN) {
          x = xRight; effectiveSide = "right";
        } else {
          x = rect.left - TP - GAP; effectiveSide = "left";
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

  // [FIX-2] Replace single requestAnimationFrame with polling interval.
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

  if (!pos || side === "none") return null;

  // Arrow tip faces TOWARD the target:
  // "top"    = arrow above target   → tip points ↓ (larger y = bottom of shape)
  // "bottom" = arrow below target   → tip points ↑ (smaller y = top of shape)
  // "left"   = arrow left of target → tip points → (larger x = right of shape)
  // "right"  = arrow right of target→ tip points ← (smaller x = left of shape)
  const arrowPath = (s: ArrowSide): string => {
    switch (s) {
      case "top":    return "M0,14 L-11,-9 L0,-4 L11,-9 Z"; // ↓ tip at bottom
      case "bottom": return "M0,-14 L-11,9 L0,4 L11,9 Z";  // ↑ tip at top
      case "left":   return "M14,0 L-9,-11 L-4,0 L-9,11 Z"; // → tip at right
      case "right":  return "M-14,0 L9,-11 L4,0 L9,11 Z";   // ← tip at left
      default:       return "";
    }
  };

  const animName = `vta-${pos.effectiveSide}`;
  const dy = pos.effectiveSide === "top" ? 6 : pos.effectiveSide === "bottom" ? -6 : 0;
  const dx = pos.effectiveSide === "left" ? 6 : pos.effectiveSide === "right" ? -6 : 0;

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

// ─── Tooltip position hook ─────────────────────────────────────

type TooltipPos = {
  top?: number;
  left?: number;
  arrowLeft?: number;
  arrowTop?: number;
  placement: "near-target" | "center";
};

function useTooltipPosition(
  selector: string | undefined,
  arrowSide: ArrowSide = "none"
): TooltipPos {
  const [pos, setPos] = useState<TooltipPos>({ placement: "center" });

  const compute = useCallback(() => {
    if (!selector || arrowSide === "none") { setPos({ placement: "center" }); return; }
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) { setPos({ placement: "center" }); return; }

    const rect = el.getBoundingClientRect();
    const CARD_W = 380;
    const GAP = 52;

    if (arrowSide === "top") {
      let left = rect.left + rect.width / 2 - CARD_W / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));
      setPos({ top: rect.bottom + GAP, left, arrowLeft: rect.left + rect.width / 2 - left, placement: "near-target" });
    } else if (arrowSide === "bottom") {
      let left = rect.left + rect.width / 2 - CARD_W / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));
      setPos({ top: rect.top - GAP - 400, left, arrowLeft: rect.left + rect.width / 2 - left, placement: "near-target" });
    } else if (arrowSide === "left") {
      let top = rect.top + rect.height / 2 - 100;
      top = Math.max(12, Math.min(top, window.innerHeight - 300));
      setPos({ top, left: rect.right + GAP + 10, arrowTop: rect.top + rect.height / 2 - top, placement: "near-target" });
    } else if (arrowSide === "right") {
      let top = rect.top + rect.height / 2 - 100;
      top = Math.max(12, Math.min(top, window.innerHeight - 300));
      setPos({ top, left: rect.left - CARD_W - GAP, arrowTop: rect.top + rect.height / 2 - top, placement: "near-target" });
    } else {
      setPos({ placement: "center" });
    }
  }, [selector, arrowSide]);

  // [FIX-3] Replace single requestAnimationFrame with polling interval and
  // add the missing scroll capture listener (SetupGuide had it, TourGuide didn't).
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

// ─── WorkspaceProgress ────────────────────────────────────────

function WorkspaceProgress({
  steps,
  completedIds,
  total,
  done,
}: {
  steps: typeof PROGRESS_STEPS;
  completedIds: Set<string>;
  total: number;
  done: number;
}) {
  const pct = total > 1 ? Math.round((done / total) * 100) : 0;

  return (
    <div
      aria-label="Tour progress"
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 9999,
        background: "white",
        borderRadius: 14,
        padding: "16px 20px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.14), 0 1px 6px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.07)",
        minWidth: 220,
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 8 }}>
        Workspace tour progress
      </p>

      <div style={{ height: 5, borderRadius: 99, background: "#e5f9f7", marginBottom: 4, overflow: "hidden" }}>
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

      <p style={{ fontSize: 10, color: "#6b7280", marginBottom: 10, textAlign: "right" }}>
        {done}/{total}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {steps.map(({ label, stepId }) => {
          const isDone = completedIds.has(stepId);
          return (
            <div key={stepId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `2px solid ${isDone ? "#0d9488" : "#d1d5db"}`,
                  background: isDone ? "#0d9488" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.3s ease",
                }}
              >
                {isDone && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4l2 2L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: isDone ? "#9ca3af" : "#374151",
                  fontWeight: isDone ? 400 : 500,
                  textDecoration: isDone ? "line-through" : "none",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TourCard ─────────────────────────────────────────────────

function TourCard({
  step,
  pos,
  visible,
  onPrimary,
  onSecondary,
  onClose,
}: {
  step: TourStep;
  pos: TooltipPos;
  visible: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
  onClose: () => void;
}) {
  const headingId  = "tour-card-heading";
  const isCentered = pos.placement === "center";

  // [FIX-7] Focus the card when it becomes visible so keyboard users
  // can interact with it without having to tab to it manually.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visible) {
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
        width: 380,
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
      tabIndex={-1}
      style={{ ...wrapStyle, outline: "none" }}
    >
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
            top: (pos.arrowTop ?? 0) - 10,
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
        <div style={{ padding: "28px 28px 24px" }}>
          {/* Account details interactive hint */}
          {step.targetIsInteractive && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#f0fdf9",
                border: "1px solid #a7f3d0",
                borderRadius: 8,
                padding: "7px 12px",
                marginBottom: 14,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#0d9488" strokeWidth="1.5" />
                <path d="M7 5v4M7 3.5v.5" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 11, color: "#065f46", fontWeight: 600 }}>
                This section is live — you can fill it in right now!
              </span>
            </div>
          )}

          {/* Close */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
            <button
              onClick={onClose}
              aria-label="Skip tour"
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
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#374151")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#9ca3af")
              }
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <h2
            id={headingId}
            style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12, letterSpacing: "-0.02em", lineHeight: 1.2 }}
          >
            {step.title}
          </h2>

          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#4b5563", marginBottom: 28 }}>
            {step.description}
          </p>

          <div style={{ height: 1, background: "#f3f4f6", marginBottom: 20 }} />

          <div style={{ display: "flex", gap: 12 }}>
            {step.secondaryLabel && (
              <button
                onClick={onSecondary}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  border: "1.5px solid #e5e7eb",
                  background: "white",
                  color: "#374151",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.borderColor = "#0d9488")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb")
                }
              >
                {step.secondaryLabel}
              </button>
            )}

            <button
              onClick={onPrimary}
              style={{
                flex: 2,
                height: 44,
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#2dd4bf 0%,#0d9488 100%)",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(13,148,136,0.35)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(13,148,136,0.45)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(13,148,136,0.35)";
              }}
            >
              {step.primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function VilletoTourGuide() {
  const user          = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const router        = useRouter();
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const setTourActive = useTourStore((s) => s.setTourActive);

  const [visible,      setVisible]      = useState(false);
  const [cardVisible,  setCardVisible]  = useState(false);
  const [stepIndex,    setStepIndex]    = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const SETTLE_MS = 700;

  // pendingRef    — nav-settle timer (card fade-in after page change)
  // advanceRef    — step-advance timer (card fade-out + index increment)
  // stepIndexRef  — live mirror of stepIndex so advance() never reads
  //                 a stale closure value (avoids stepIndex dep in useCallback)
  const pendingRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepIndexRef = useRef(0);

  const roleStr = getRoleString(user);
  const steps   = getFilteredSteps(user, hasPermission);
  const step    = steps[stepIndex];

  // ── [FIX-5] Keep stepIndexRef in sync ─────────────────────
  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  // ── Cleanup all timers on unmount ─────────────────────────
  useEffect(() => {
    return () => {
      if (pendingRef.current)  clearTimeout(pendingRef.current);
      if (advanceRef.current)  clearTimeout(advanceRef.current);
    };
  }, []);

  // ── Broadcast tour state ───────────────────────────────────
  useEffect(() => {
    setTourActive(visible);
    return () => setTourActive(false);
  }, [visible, setTourActive]);

  // ── Gate ───────────────────────────────────────────────────
  const tourKey     = user?.userId ? TOUR_KEY(user.userId) : null;
  const alreadySeen = tourKey ? sessionStorage.getItem(tourKey) === "1" : true;

  const isFirstLogin =
    !!user &&
    typeof user.loginCount === "number" &&
    user.loginCount < 1;

  // Exclude only the company founder — the CONTROLLING_OFFICER whose account
  // was created at the same moment as the company (createdAt timestamps match).
  const isCompanyFounder =
    user?.position === "CONTROLLING_OFFICER" &&
    !!user?.createdAt &&
    user.createdAt === user?.company?.createdAt;

  const shouldShow = isFirstLogin && !alreadySeen && !isCompanyFounder;

  // ── [FIX-4] Start tour ────────────────────────────────────
  // Original code used requestAnimationFrame(() => setCardVisible(true))
  // inside a 1500ms timeout. rAF fires ~16ms later — before the page has
  // settled — so the card often appeared before the spotlight measured its
  // target. Use a second setTimeout with a small extra delay instead.
  useEffect(() => {
    if (!shouldShow) return;
    const t1 = setTimeout(() => setVisible(true), 1500);
    const t2 = setTimeout(() => setCardVisible(true), 1550);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [shouldShow]);

  // ── [FIX-6] Navigation + card visibility ──────────────────
  // The original router.push branch returned undefined (no cleanup
  // registered), so if the effect re-ran before navigation resolved
  // the pending settle timer leaked. Now every branch registers cleanup.
  useEffect(() => {
    if (!visible || !step) return;
    if (pendingRef.current) clearTimeout(pendingRef.current);

    const targetUrl = step.navigateUrl ?? step.navigateTo;

    const tabMatch  = targetUrl.match(/tab=([^&]+)/);
    const targetTab = tabMatch ? tabMatch[1] : null;
    const currTab   = searchParams.get("tab");

    const isOnWrongPage = pathname !== step.navigateTo;
    const isOnWrongTab  = targetTab ? currTab !== targetTab : false;

    if (isOnWrongPage || isOnWrongTab) {
      router.push(targetUrl);
      return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
    }

    setCardVisible(false);
    pendingRef.current = setTimeout(() => setCardVisible(true), SETTLE_MS);
    return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
  }, [pathname, searchParams, stepIndex, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close tour ─────────────────────────────────────────────
  const closeTour = useCallback(() => {
    if (!user) return;
    sessionStorage.setItem(TOUR_KEY(user.userId), "1");
    setCardVisible(false);
    setTimeout(() => setVisible(false), 350);
  }, [user]);

  // ── [FIX-5] Advance step ───────────────────────────────────
  // Read current index from ref so this callback never captures a stale
  // stepIndex from its closure — stepIndex is no longer a dep, which also
  // means the keyboard effect no longer tears down and re-attaches its
  // listener on every step change.
  const advance = useCallback(() => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    setCardVisible(false);
    const cur = stepIndexRef.current;
    advanceRef.current = setTimeout(() => {
      const next = cur + 1;
      if (next >= steps.length) { closeTour(); return; }
      setCompletedIds((prev) => {
        const s = new Set(prev);
        // Mark current step complete using cur (not stepIndexRef — by the time
        // this runs we want the step that was active when advance() was called).
        const currentStep = steps[cur];
        if (currentStep?.id) s.add(currentStep.id);
        return s;
      });
      setStepIndex(next);
    }, 280);
  }, [steps, closeTour]);

  // ── Primary CTA ────────────────────────────────────────────
  const handlePrimary = useCallback(() => {
    if (step?.id === "setup-complete") {
      router.push("/expenses?tab=personal-expenses");
      closeTour();
      return;
    }
    advance();
  }, [step, router, closeTour, advance]);

  // ── Secondary CTA ──────────────────────────────────────────
  const handleSecondary = useCallback(() => {
    if (step?.id === "setup-complete") {
      router.push("/dashboard");
      closeTour();
      return;
    }
    if (step?.secondaryLabel?.toLowerCase().includes("skip")) {
      closeTour();
      return;
    }
    advance();
  }, [step, router, advance, closeTour]);

  // ── [FIX-8] Keyboard ───────────────────────────────────────
  // Guard Enter: do NOT advance the tour when focus is inside a form
  // field — this was swallowing keypresses in the interactive Account
  // Details step whenever the user pressed Enter to submit a form field.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeTour();
        return;
      }
      if (e.key === "Enter") {
        const tag = (e.target as HTMLElement)?.tagName ?? "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        handlePrimary();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, handlePrimary, closeTour]);

  // ── Tooltip position ───────────────────────────────────────
  const pos = useTooltipPosition(step?.targetSelector, step?.arrowSide ?? "none");

  // ── Progress tracker ───────────────────────────────────────
  const progressList = PROGRESS_STEPS.filter((ps) =>
    steps.some((s) => s.id === ps.stepId)
  );
  const progressDone = progressList.filter((ps) => completedIds.has(ps.stepId)).length;

  if (!visible || !step || steps.length === 0) return null;

  const isWelcome = step.id === "welcome";

  return (
    <>
      {/*
       * Click-blocking layer.
       * Blocks all page interactions EXCEPT for the interactive target
       * element on steps where targetIsInteractive === true.
       * zIndex 9989 — above content, below SVG overlay (9990).
       */}
      {step.targetIsInteractive ? (
        // For interactive steps: pointer-events:none so the underlying
        // interactive element is reachable through the overlay.
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9989,
            pointerEvents: "none",
            cursor: "default",
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9989,
            pointerEvents: "all",
            cursor: "default",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}

      {/* Full-screen SVG spotlight overlay */}
      <SpotlightOverlay
        sidebarHref={isWelcome ? undefined : step.sidebarHref}
        targetSelector={isWelcome ? undefined : step.targetSelector}
        targetIsInteractive={step.targetIsInteractive}
        visible={cardVisible}
      />

      {/* Bouncing pointer arrow — always rendered on top of overlay */}
      {!isWelcome && step.targetSelector && step.arrowSide && step.arrowSide !== "none" && (
        <PointerArrow
          targetSelector={step.targetSelector}
          side={step.arrowSide}
        />
      )}

      {/* Tour card */}
      <TourCard
        step={step}
        pos={pos}
        visible={cardVisible}
        onPrimary={handlePrimary}
        onSecondary={handleSecondary}
        onClose={closeTour}
      />

      {/* Workspace progress tracker */}
      {!isWelcome && progressList.length > 0 && (
        <WorkspaceProgress
          steps={progressList}
          completedIds={completedIds}
          total={progressList.length}
          done={progressDone}
        />
      )}
    </>
  );
}