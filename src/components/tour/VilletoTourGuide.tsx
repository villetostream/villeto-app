"use client";

/**
 * VilletoTourGuide
 * ─────────────────────────────────────────────────────────────
 * First-login (loginCount < 1) workspace-setup tour.
 *
 * Overlay behaviour:
 *  • A full-screen SVG overlay dims the ENTIRE viewport
 *  • The active sidebar nav row is "punched out" of the overlay
 *    (SVG evenodd fill-rule) so it glows through cleanly
 *  • A teal glowing border rings the spotlight
 *
 * Navigation:
 *  • Each step navigates to its page via router.push()
 *  • The tooltip card (with arrow) appears near the page element
 *    after a settle delay so the DOM is ready
 *
 * Progress:
 *  • Bottom-right "Workspace setup progress" tracker
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-stores";
import { Roles } from "@/core/permissions/roles";

// ─── Types ────────────────────────────────────────────────────

type ArrowSide = "top" | "bottom" | "left" | "none";

type TourStep = {
  id: string;
  /** pathname used to detect "already on page" — no query params */
  navigateTo: string;
  /** actual URL pushed to the router (may include query params) */
  navigateUrl?: string;
  /** href of the SIDEBAR nav link to spotlight (e.g. "/people") */
  sidebarHref?: string;
  /** CSS selector for the in-page element the arrow points at */
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
};

// ─── Step Definitions ─────────────────────────────────────────

const ALL_STEPS: TourStep[] = [
  // 0 — Welcome (centered, no sidebar spotlight)
  {
    id: "welcome",
    navigateTo: "/dashboard",
    sidebarHref: "/dashboard",
    arrowSide: "none",
    title: "Welcome to Villeto",
    description:
      "Welcome to Villeto. Let's set up your workspace so you can start managing company spend with policies, approvals, and structured workflows.",
    primaryLabel: "Start Setup",
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
      "Upload your employee directory to assign policies and approval workflows across your organization.",
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
    title: "Send Invitations",
    description:
      "Invite employees with different roles so they can create reports and participate in approval workflows.",
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
      "Expense categories help organize company spending and power approval policies. Start by defining how your organization tracks expenses.",
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
      "Policies control who can spend, how much they can spend, and when approvals are required. Set thresholds to automatically trigger approvals and enforce spend limits.",
    primaryLabel: "Next",
    secondaryLabel: "Skip Tour",
    progressLabel: "Policy",
    roles: [Roles.CONTROLLING_OFFICER, Roles.ORGANIZATION_OWNER, Roles.FINANCE_ADMIN],
    requiredPermission: "expense_policies:read",
  },

  // 5 — Setup Complete
  {
    id: "setup-complete",
    navigateTo: "/expenses",
    sidebarHref: "/expenses",
    targetSelector: 'a[href="/expenses"]',
    arrowSide: "left",
    title: "Setup Complete",
    description: "Your workspace is ready. You can now start managing expenses, approvals, and vendor payments in Villeto.",
    primaryLabel: "Create Expense Report",
    secondaryLabel: "Go to Overview",
  },
];

// ─── Progress tracker items ────────────────────────────────────

const PROGRESS_STEPS = [
  { label: "Directory upload", stepId: "directory" },
  { label: "Invitations sent", stepId: "invitations" },
  { label: "Expense category", stepId: "expense-category" },
  { label: "Policy",           stepId: "policies" },
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

function isFullAdmin(roleStr: string): boolean {
  return [
    Roles.CONTROLLING_OFFICER,
    Roles.ORGANIZATION_OWNER,
    "ADMIN",
    "OWNER",
  ].includes(roleStr as never);
}

function getFilteredSteps(
  user: ReturnType<typeof useAuthStore>["user"],
  hasPermission: (p: string | string[]) => boolean
): TourStep[] {
  const roleStr = getRoleString(user);
  return ALL_STEPS.filter((step) => {
    if (step.roles?.length) {
      if (!step.roles.includes(roleStr) && !isFullAdmin(roleStr)) return false;
    }
    if (step.requiredPermission) {
      if (!hasPermission(step.requiredPermission) && !isFullAdmin(roleStr))
        return false;
    }
    return true;
  });
}

// ─── SVG Punch-hole Spotlight Overlay ─────────────────────────
//
// Covers the ENTIRE viewport with a semi-opaque SVG layer.
// The active sidebar nav item's row is "punched out" using
// SVG's evenodd fill rule so it appears fully lit.
// A glowing teal border frames the punch-out.

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

/**
 * Full-screen SVG overlay.
 * Punches two "holes" using SVG evenodd fill-rule:
 *  1. The active sidebar nav row (left edge → sidebar right edge)
 *  2. The in-page target element the tour arrow points at
 * Both holes + glowing teal borders make them clearly visible.
 */
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
  const [sidebarSpot, setSidebarSpot] = useState<SpotRect & { sidebarW: number } | null>(null);
  const [targetSpot,  setTargetSpot]  = useState<SpotRect | null>(null);
  const rafRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });

    // ── Sidebar spotlight ──
    if (sidebarHref) {
      const el = document.querySelector<HTMLElement>(
        `a[href="${sidebarHref}"], [data-href="${sidebarHref}"]`
      );
      if (el) {
        const r = el.getBoundingClientRect();
        setSidebarSpot({ top: r.top, bottom: r.bottom, left: 0, right: getSidebarWidth(), sidebarW: getSidebarWidth() });
      } else {
        setSidebarSpot(null);
      }
    } else {
      setSidebarSpot(null);
    }

    // ── Target-element spotlight ──
    if (targetSelector) {
      setTargetSpot(measureEl(targetSelector));
    } else {
      setTargetSpot(null);
    }
  }, [sidebarHref, targetSelector]);

  useEffect(() => {
    measure();
    rafRef.current = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  if (vp.w === 0) return null;

  const { w, h } = vp;
  const SP = 6;  // sidebar punch padding
  const TP = 8;  // target punch padding

  const outer = `M0 0 L${w} 0 L${w} ${h} L0 ${h}Z`;

  // Sidebar punch-hole: left edge → sidebar right, height of the nav row
  const sHole = sidebarSpot
    ? `M0 ${sidebarSpot.top - SP} L${sidebarSpot.sidebarW} ${sidebarSpot.top - SP} ` +
      `L${sidebarSpot.sidebarW} ${sidebarSpot.bottom + SP} L0 ${sidebarSpot.bottom + SP}Z`
    : "";

  // Target-element punch-hole: exact bounding box of the target
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
      {/* Dim everything, minus the two punch-holes */}
      <path fillRule="evenodd" d={d} fill="rgba(0,0,0,0.52)" />

      {/* Sidebar spotlight border */}
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

      {/* Target-element spotlight border */}
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

// ─── Tooltip position hook ─────────────────────────────────────

type TooltipPos = {
  top?: number;
  left?: number;
  arrowLeft?: number;
  placement: "near-target" | "center";
};

function useTooltipPosition(
  selector: string | undefined,
  arrowSide: ArrowSide = "none"
): TooltipPos {
  const [pos, setPos] = useState<TooltipPos>({ placement: "center" });

  const compute = useCallback(() => {
    if (!selector || arrowSide === "none") {
      setPos({ placement: "center" });
      return;
    }
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      setPos({ placement: "center" });
      return;
    }

    const rect = el.getBoundingClientRect();
    const CARD_W = 380;
    const GAP = 10;

    if (arrowSide === "top") {
      // Card appears BELOW the target element
      let left = rect.left + rect.width / 2 - CARD_W / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));
      const arrowLeft = rect.left + rect.width / 2 - left;
      setPos({ top: rect.bottom + GAP, left, arrowLeft, placement: "near-target" });
    } else if (arrowSide === "bottom") {
      let left = rect.left + rect.width / 2 - CARD_W / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));
      const arrowLeft = rect.left + rect.width / 2 - left;
      setPos({
        top: rect.top - GAP - 400, // estimated card height
        left,
        arrowLeft,
        placement: "near-target",
      });
    } else if (arrowSide === "left") {
      let top = rect.top + rect.height / 2 - 100;
      top = Math.max(12, Math.min(top, window.innerHeight - 300));
      const left = rect.right + GAP + 10;
      const arrowTop = rect.top + rect.height / 2 - top;
      setPos({ top, left, arrowTop, placement: "near-target" });
    } else {
      setPos({ placement: "center" });
    }
  }, [selector, arrowSide]);

  useEffect(() => {
    compute();
    const raf = requestAnimationFrame(compute);
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", compute);
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
  const pct = total > 1 ? Math.round((done / (total)) * 100) : 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
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
        Workspace setup progress
      </p>

      {/* Bar */}
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

      {/* Checklist */}
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
  const isCentered = pos.placement === "center";

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
    <div style={wrapStyle}>
      {/* Arrow pointing UP toward the target element above */}
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

      {/* Arrow pointing LEFT toward the target element to the left */}
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

      {/* Card */}
      <div
        style={{
          background: "white",
          borderRadius: 18,
          boxShadow: "0 24px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "28px 28px 24px" }}>
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

          {/* Title */}
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {step.title}
          </h2>

          {/* Description */}
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#4b5563", marginBottom: 28 }}>
            {step.description}
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: "#f3f4f6", marginBottom: 20 }} />

          {/* Buttons */}
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
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#0d9488")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb")}
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
  const user        = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const router    = useRouter();
  const pathname  = usePathname();
  const searchParams = useSearchParams();

  const [visible,     setVisible]     = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [stepIndex,   setStepIndex]   = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const SETTLE_MS = 700; // wait after navigation before showing card
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = getFilteredSteps(user, hasPermission);
  const step  = steps[stepIndex];

  // ── Gate: loginCount < 1 means first-ever login (count = 0) ──
  const tourKey       = user?.userId ? TOUR_KEY(user.userId) : null;
  const alreadySeen   = tourKey ? sessionStorage.getItem(tourKey) === "1" : true;
  const isFirstLogin  =
    !!user &&
    typeof user.loginCount === "number" &&
    user.loginCount > 1;
  const shouldShow = isFirstLogin && !alreadySeen;

  // ── Start the tour ────────────────────────────────────────
  useEffect(() => {
    if (!shouldShow) return;
    const t = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setCardVisible(true));
    }, 1500); // allow SetPasswordModal to render first if needed
    return () => clearTimeout(t);
  }, [shouldShow]);

  // ── Navigation + card visibility (single effect, no stale closure) ──────
  //
  // By depending on [pathname, searchParams, stepIndex, visible] we always have fresh
  // values of `step`.  Two cases:
  //  • Already on the right page & tab → hide card briefly then show it.
  //  • Wrong page/tab → router.push(), then this effect re-fires when
  //    URL updates, hitting the "already on page" branch.
  useEffect(() => {
    if (!visible || !step) return;
    if (pendingRef.current) clearTimeout(pendingRef.current);

    const targetUrl = step.navigateUrl ?? step.navigateTo;
    
    // Determine if we are on the wrong tab (via URL parameters)
    const targetTabMatches = targetUrl.match(/tab=([^&]+)/);
    const targetTabStr = targetTabMatches ? targetTabMatches[1] : null;
    const currentTab = searchParams.get("tab");
    
    // We are on the wrong URL if the pathname differs OR if the tab differs 
    // (but only strictly check the tab if the targetUrl explicitly specified one)
    const isOnWrongPage = pathname !== step.navigateTo;
    const isOnWrongTab = targetTabStr ? currentTab !== targetTabStr : false;

    if (isOnWrongPage || isOnWrongTab) {
      // Navigate — the URL change will re-trigger this effect
      router.push(targetUrl);
      return;
    }

    // On the correct page & tab — show the card after DOM settles
    setCardVisible(false);
    pendingRef.current = setTimeout(() => setCardVisible(true), SETTLE_MS);
    return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
  }, [pathname, searchParams, stepIndex, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close tour ────────────────────────────────────────────
  const closeTour = useCallback(() => {
    if (!user) return;
    sessionStorage.setItem(TOUR_KEY(user.userId), "1");
    setCardVisible(false);
    setTimeout(() => setVisible(false), 350);
  }, [user]);

  // ── Advance step ──────────────────────────────────────────
  const advance = useCallback(() => {
    setCardVisible(false);
    setTimeout(() => {
      const next = stepIndex + 1;
      if (next >= steps.length) { closeTour(); return; }
      setCompletedIds((prev) => {
        const s = new Set(prev);
        if (step?.id) s.add(step.id);
        return s;
      });
      setStepIndex(next);
    }, 280);
  }, [stepIndex, steps.length, step, closeTour]);

  // ── Primary CTA ───────────────────────────────────────────
  const handlePrimary = useCallback(() => {
    // If it's the final step, route to expenses and finish the tour
    if (step?.id === "setup-complete") {
      router.push("/expenses?tab=personal-expenses");
      closeTour();
      return;
    }
    
    // Otherwise, for "Start Setup" or "Next", just peacefully advance
    advance();
  }, [step, router, closeTour, advance]);

  // ── Secondary CTA (Next / Skip) ──────────────────────────
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

  // ── Keyboard ──────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTour();
      if (e.key === "Enter")  handlePrimary();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, handlePrimary, closeTour]);

  // ── Tooltip position ──────────────────────────────────────
  const pos = useTooltipPosition(step?.targetSelector, step?.arrowSide ?? "none");

  // ── Progress tracker ──────────────────────────────────────
  const progressList = PROGRESS_STEPS.filter((ps) => steps.some((s) => s.id === ps.stepId));
  const progressDone = progressList.filter((ps) => completedIds.has(ps.stepId)).length;

  if (!visible || !step || steps.length === 0) return null;

  const isWelcome = step.id === "welcome";

  return (
    <>
      {/*
       * Full-screen SVG overlay.
       * On non-welcome steps: the active sidebar nav row is
       * punched out so it glows through clearly.
       * On welcome: cover everything (no punch-out).
       */}
      <SpotlightOverlay
        sidebarHref={isWelcome ? undefined : step.sidebarHref}
        targetSelector={isWelcome ? undefined : step.targetSelector}
        visible={cardVisible}
      />

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
