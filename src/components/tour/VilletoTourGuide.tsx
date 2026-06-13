"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore, type User } from "@/stores/auth-stores";
import { Roles } from "@/core/permissions/roles";
import { useTourStore } from "@/stores/useTourStore";
import { useLayoutSchedule } from "@/hooks/useLayoutSchedule";

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
    targetIsInteractive: true,
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
    targetSelector: '[data-tour="update-details-button"]',
    // "top" places the card BELOW the button (card top = button.bottom + gap).
    // This keeps the form fields above the button fully accessible — using
    // "bottom" was placing the card ABOVE the button, covering the form inputs.
    arrowSide: "top",
    title: "Set Up Account Details",
    description:
      "Add your bank details so reimbursements can be paid directly to you. Fill in the form above, then click \"Update Details\" to save — the tour will advance automatically.",
    primaryLabel: "Next",
    secondaryLabel: "Skip Tour",
    progressLabel: "Account details",
    targetIsInteractive: true, // let the form be used during this step
  },

  // 6 — Setup Complete → point to the "New Report" button (mirrors SetupGuide BONUS_STEP)
  {
    id: "setup-complete",
    navigateTo: "/expenses",
    navigateUrl: "/expenses?tab=personal-expenses",
    sidebarHref: "/expenses",
    targetSelector: '[data-tour="new-report-button"]',
    arrowSide: "top",
    title: "Create Your First Report",
    description:
      "That's the tour! Your workspace is ready. Click \"New Report\" above to start adding your first expense — or hit \"Create Expense Report\" below.",
    primaryLabel: "Create Expense Report",
    secondaryLabel: "Go to Overview",
    targetIsInteractive: true, // allow the user to click the new-report-button directly
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

function getRoleString(user: User | null): string {
  return (
    user?.villetoRole?.name?.toUpperCase() ||
    user?.position?.toUpperCase() ||
    ""
  );
}

function getFilteredSteps(
  user: User | null,
  can: (resource: string, action: string) => boolean
): TourStep[] {
  const roleStr = getRoleString(user);
  return ALL_STEPS.filter((step) => {
    if (step.roles?.length) {
      if (!step.roles.includes(roleStr)) return false;
    }
    if (step.requiredPermission) {
      const [resource, action] = step.requiredPermission.includes(".")
        ? (() => {
            const lastDot = step.requiredPermission.lastIndexOf(".");
            return [
              step.requiredPermission.substring(0, lastDot),
              step.requiredPermission.substring(lastDot + 1),
            ] as const;
          })()
        : (["", ""] as const);
      if (resource && action && !can(resource, action)) return false;
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

  useLayoutSchedule(measure, { pollMs: 1000 });

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

    setPos((prev) => {
      if (
        prev &&
        prev.x === x &&
        prev.y === y &&
        prev.effectiveSide === effectiveSide
      ) {
        return prev;
      }
      return { x, y, effectiveSide };
    });
  }, [targetSelector, side]);

  useLayoutSchedule(compute, { pollMs: 1000 });

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
  arrowSide: ArrowSide = "none",
  enabled = false
): TooltipPos {
  const [pos, setPos] = useState<TooltipPos>({ placement: "center" });

  const compute = useCallback(() => {
    if (!selector || arrowSide === "none") {
      setPos((p) =>
        p.placement === "center" ? p : { placement: "center" }
      );
      return;
    }
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      setPos((p) =>
        p.placement === "center" ? p : { placement: "center" }
      );
      return;
    }

    const rect = el.getBoundingClientRect();
    const CARD_W = 380;
    const GAP = 52;

    let next: TooltipPos = { placement: "center" };

    if (arrowSide === "top") {
      let left = rect.left + rect.width / 2 - CARD_W / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));
      next = {
        top: rect.bottom + GAP,
        left,
        arrowLeft: rect.left + rect.width / 2 - left,
        placement: "near-target",
      };
    } else if (arrowSide === "bottom") {
      let left = rect.left + rect.width / 2 - CARD_W / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));
      next = {
        top: rect.top - GAP - 400,
        left,
        arrowLeft: rect.left + rect.width / 2 - left,
        placement: "near-target",
      };
    } else if (arrowSide === "left") {
      let top = rect.top + rect.height / 2 - 100;
      top = Math.max(12, Math.min(top, window.innerHeight - 300));
      next = {
        top,
        left: rect.right + GAP + 10,
        arrowTop: rect.top + rect.height / 2 - top,
        placement: "near-target",
      };
    } else if (arrowSide === "right") {
      let top = rect.top + rect.height / 2 - 100;
      top = Math.max(12, Math.min(top, window.innerHeight - 300));
      next = {
        top,
        left: rect.left - CARD_W - GAP,
        arrowTop: rect.top + rect.height / 2 - top,
        placement: "near-target",
      };
    }

    setPos((p) => {
      if (
        p.placement === next.placement &&
        p.top === next.top &&
        p.left === next.left &&
        p.arrowLeft === next.arrowLeft &&
        p.arrowTop === next.arrowTop
      ) {
        return p;
      }
      return next;
    });
  }, [selector, arrowSide]);

  useLayoutSchedule(compute, { enabled, pollMs: enabled ? 1000 : 0 });

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
        zIndex: 10001,
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
        zIndex: 10000,
        width: 420,
        maxWidth: "calc(100vw - 32px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.46,0.64,1)",
      }
    : {
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 10000,
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
          maxHeight: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "28px 28px 24px", overflowY: "auto" }}>
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
  const can = useAuthStore((s) => s.can);
  const router        = useRouter();
  const pathname      = usePathname();
  const searchParams  = useSearchParams();
  const setTourActive = useTourStore((s) => s.setTourActive);
  const setupGuideReady = useTourStore((s) => s.setupGuideReady ?? false);

  const [visible,      setVisible]      = useState(false);
  const [cardVisible,  setCardVisible]  = useState(false);
  const [stepIndex,    setStepIndex]    = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  
  const closeVisibleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── alreadySeen — reactive, localStorage-backed ────────────
  // Using localStorage (not sessionStorage) so the flag survives browser
  // restarts on the same device. A separate effect auto-sets it when
  // loginCount > 1 so the tour never re-appears on subsequent logins,
  // including logins from a different device (as long as loginCount is
  // correctly incremented server-side via /users/me).
  const [alreadySeen, setAlreadySeen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const key = user?.userId ? TOUR_KEY(user.userId) : null;
    return key ? localStorage.getItem(key) === "1" : false;
  });

  // ── [FIX-TDZ] Freeze login count at first user hydration ──
  const [mountLoginCount, setMountLoginCount] = useState<number | null>(null);
  if (mountLoginCount === null && user !== null) {
    setMountLoginCount(
      typeof user.loginCount === "number" ? user.loginCount : -1
    );
  }

  const tourKey = user?.userId ? TOUR_KEY(user.userId) : null;

  // Use the login count that was in the store at mount time (frozen above).
  // This prevents the /users/me refresh from flipping isFirstLogin to false
  // after the 1500 ms start-tour timer has already been queued.
  const isFirstLogin =
    !!user &&
    mountLoginCount !== null &&
    mountLoginCount === 0;

  // Exclude only the company founder — the CONTROLLING_OFFICER whose account
  // was created at the same moment as the company (createdAt timestamps match).
  const isCompanyFounder =
    user?.position === "CONTROLLING_OFFICER" &&
    !!user?.createdAt &&
    user.createdAt === user?.company?.createdAt;

  const shouldShow = isFirstLogin && !alreadySeen && !isCompanyFounder && setupGuideReady;

  const loginCount = user?.loginCount ?? 0;
  if (user?.userId && setupGuideReady && loginCount > 1 && tourKey && !alreadySeen) {
    if (typeof window !== "undefined" && localStorage.getItem(tourKey) !== "1") {
      localStorage.setItem(tourKey, "1");
    }
    setAlreadySeen(true);
  }

  const SETTLE_MS = 700;

  // pendingRef    — nav-settle timer (card fade-in after page change)
  // advanceRef    — step-advance timer (card fade-out + index increment)
  // stepIndexRef  — live mirror of stepIndex so advance() never reads
  //                 a stale closure value (avoids stepIndex dep in useCallback)
  const pendingRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepIndexRef = useRef(0);
  const settledRef   = useRef<{ pathname: string; tab: string | null; stepIndex: number } | null>(null);

  const _roleStr = getRoleString(user);
  const steps   = getFilteredSteps(user, can);
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

  // ── Broadcast tour state (only while the card is visible) ──
  useEffect(() => {
    setTourActive(visible && cardVisible);
    return () => setTourActive(false);
  }, [visible, cardVisible, setTourActive]);

  // ── Start or dismiss tour based on eligibility ─────────────
  useEffect(() => {
    if (!shouldShow) {
      settledRef.current = null;
      const dismissId = window.setTimeout(() => {
        setCardVisible(false);
        setVisible(false);
      }, 0);
      return () => clearTimeout(dismissId);
    }

    const t1 = setTimeout(() => setVisible(true), 1500);
    const t2 = setTimeout(() => setCardVisible(true), 1550);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [shouldShow]);

  const currTab = searchParams.get("tab");

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

    const isOnWrongPage = pathname !== step.navigateTo;
    const isOnWrongTab  = targetTab ? currTab !== targetTab : false;

    if (isOnWrongPage || isOnWrongTab) {
      settledRef.current = null;
      router.push(targetUrl);
      return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
    }

    const settled = settledRef.current;
    const alreadySettled =
      settled &&
      settled.pathname === pathname &&
      settled.tab === currTab &&
      settled.stepIndex === stepIndex;

    if (alreadySettled) {
      const showId = window.setTimeout(() => setCardVisible(true), 0);
      return () => clearTimeout(showId);
    }

    settledRef.current = { pathname, tab: currTab, stepIndex };

    const hideCardId = window.setTimeout(() => setCardVisible(false), 0);
    pendingRef.current = setTimeout(() => setCardVisible(true), SETTLE_MS);
    return () => {
      clearTimeout(hideCardId);
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, [pathname, currTab, stepIndex, visible, step, router]);

  // ── Close tour ─────────────────────────────────────────────
  const closeTour = useCallback(() => {
  if (!user) return;
  localStorage.setItem(TOUR_KEY(user.userId), "1");
  setAlreadySeen(true);
  settledRef.current = null;
  setCardVisible(false);
  // Cancel any pending re-show before hiding visible
  if (closeVisibleTimerRef.current) clearTimeout(closeVisibleTimerRef.current);
  if (pendingRef.current) clearTimeout(pendingRef.current);   // ← cancel settle timer
  closeVisibleTimerRef.current = setTimeout(() => setVisible(false), 350);
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

  // ── Account-details completion listener ───────────────────
  // VilletoSetupGuide uses custom window events to silently tick steps.
  // TourGuide must do the same for the account-details step so that when
  // the user saves their bank details (which dispatches
  // "villeto:account-details-saved" via notifySetupGuide), the tour
  // automatically marks that step complete and advances — identical
  // behaviour to SetupGuide's markStepDone flow.
  useEffect(() => {
    if (!visible) return;
    const handler = () => {
      // Only act if the current step is account-details
      if (steps[stepIndexRef.current]?.id !== "account-details") return;
      // Fade card out, mark done, advance after short delay (mirrors advance())
      if (advanceRef.current) clearTimeout(advanceRef.current);
      setCardVisible(false);
      const cur = stepIndexRef.current;
      advanceRef.current = setTimeout(() => {
        const next = cur + 1;
        if (next >= steps.length) { closeTour(); return; }
        setCompletedIds((prev) => {
          const s = new Set(prev);
          s.add("account-details");
          return s;
        });
        setStepIndex(next);
      }, 800);
    };
    window.addEventListener("villeto:account-details-saved", handler);
    return () => window.removeEventListener("villeto:account-details-saved", handler);
  }, [visible, steps, closeTour]);

  // ── Primary CTA ────────────────────────────────────────────
  const handlePrimary = useCallback(() => {
    if (step?.id === "setup-complete") {
      // Navigate to the new-report flow and close the tour.
      // This mirrors the SetupGuide BONUS_STEP: either the user clicks the
      // highlighted button directly (targetIsInteractive) or uses this CTA.
      router.push("/expenses/new-report");
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
  const pos = useTooltipPosition(
    step?.targetSelector,
    step?.arrowSide ?? "none",
    visible && cardVisible
  );

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
       * Click-blocking layer — only while the tour card is visible.
       * Previously this blocked the entire page even during card fade
       * transitions, leaving the dashboard unusable with no visible tour UI.
       */}
      {cardVisible && (
        step.targetIsInteractive ? (
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
        )
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