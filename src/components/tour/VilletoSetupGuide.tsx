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
      "Upload your employee directory (Excel/CSV) so you can assign policies and approval workflows across your organisation.",
    completionEvent: "villeto:directory-uploaded",
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
  const rafRef = useRef<number | null>(null);

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
    rafRef.current = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", measure);
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

// ─── Animated pointer arrow ───────────────────────────────────
// A bouncing arrow drawn on top of the spotlight to make it
// unmistakably clear which button the user should click.

function PointerArrow({
  targetSelector,
  side = "top",
}: {
  targetSelector?: string;
  side?: ArrowSide;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const compute = useCallback(() => {
    if (!targetSelector) { setPos(null); return; }
    const rect = measureEl(targetSelector);
    if (!rect) { setPos(null); return; }

    // Position the arrow TIP just outside the spotlight border
    const TP = 8; // must match SpotlightOverlay's TP
    switch (side) {
      case "top":
        setPos({ x: (rect.left + rect.right) / 2, y: rect.top - TP - 36 });
        break;
      case "bottom":
        setPos({ x: (rect.left + rect.right) / 2, y: rect.bottom + TP + 36 });
        break;
      case "left":
        setPos({ x: rect.left - TP - 36, y: (rect.top + rect.bottom) / 2 });
        break;
      case "right":
        setPos({ x: rect.right + TP + 36, y: (rect.top + rect.bottom) / 2 });
        break;
      default:
        setPos(null);
    }
  }, [targetSelector, side]);

  useEffect(() => {
    compute();
    rafRef.current = requestAnimationFrame(compute);
    window.addEventListener("resize", compute);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", compute);
    };
  }, [compute]);

  if (!pos) return null;

  // SVG arrow pointing TOWARD the target
  // For "top" side: arrow points downward ↓
  const arrowPath = (s: ArrowSide) => {
    switch (s) {
      case "top":    return "M0,-12 L10,12 L0,6 L-10,12 Z"; // ↓
      case "bottom": return "M0,12 L10,-12 L0,-6 L-10,-12 Z"; // ↑
      case "left":   return "M-12,0 L12,10 L6,0 L12,-10 Z"; // →
      case "right":  return "M12,0 L-12,10 L-6,0 L-12,-10 Z"; // ←
      default:       return "";
    }
  };

  return (
    <svg
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 9995,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <style>{`
        @keyframes villeto-bounce-down  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
        @keyframes villeto-bounce-up    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes villeto-bounce-right { 0%,100%{transform:translateX(0)} 50%{transform:translateX(8px)} }
        @keyframes villeto-bounce-left  { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-8px)} }
        .va-top    { animation: villeto-bounce-down  1s ease-in-out infinite; transform-origin: ${pos.x}px ${pos.y}px; }
        .va-bottom { animation: villeto-bounce-up    1s ease-in-out infinite; transform-origin: ${pos.x}px ${pos.y}px; }
        .va-left   { animation: villeto-bounce-right 1s ease-in-out infinite; transform-origin: ${pos.x}px ${pos.y}px; }
        .va-right  { animation: villeto-bounce-left  1s ease-in-out infinite; transform-origin: ${pos.x}px ${pos.y}px; }
      `}</style>
      <g
        className={`va-${side}`}
        transform={`translate(${pos.x}, ${pos.y})`}
      >
        <path
          d={arrowPath(side)}
          fill="#0d9488"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 2px 6px rgba(13,148,136,0.6))" }}
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
    if (!el) { setPos({ placement: "center" }); return; }

    const rect = el.getBoundingClientRect();
    const CARD_W = 400;
    const GAP = 56; // extra gap to clear the pointer arrow

    if (arrowSide === "top") {
      let left = rect.left + rect.width / 2 - CARD_W / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));
      const arrowLeft = rect.left + rect.width / 2 - left;
      setPos({ top: rect.bottom + GAP, left, arrowLeft, placement: "near-target" });
    } else if (arrowSide === "bottom") {
      let left = rect.left + rect.width / 2 - CARD_W / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - CARD_W - 12));
      const arrowLeft = rect.left + rect.width / 2 - left;
      setPos({ top: rect.top - GAP - 360, left, arrowLeft, placement: "near-target" });
    } else if (arrowSide === "left") {
      let top = rect.top + rect.height / 2 - 100;
      top = Math.max(12, Math.min(top, window.innerHeight - 300));
      setPos({ top, left: rect.right + GAP, arrowTop: rect.top + rect.height / 2 - top, placement: "near-target" });
    } else if (arrowSide === "right") {
      let top = rect.top + rect.height / 2 - 100;
      top = Math.max(12, Math.min(top, window.innerHeight - 300));
      setPos({ top, left: rect.left - CARD_W - GAP, arrowTop: rect.top + rect.height / 2 - top, placement: "near-target" });
    } else {
      setPos({ placement: "center" });
    }
  }, [selector, arrowSide]);

  useEffect(() => {
    compute();
    const raf = requestAnimationFrame(compute);
    window.addEventListener("resize", compute);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", compute); };
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
}: {
  steps: SetupStep[];
  completedIds: Set<string>;
  current: number;
  onResume: () => void;
  isSkipped: boolean;
}) {
  const done  = steps.filter((s) => completedIds.has(s.id)).length;
  const total = steps.length;
  const pct   = Math.round((done / total) * 100);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: isSkipped ? 200 : 9999,
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: isSkipped ? 14 : 0 }}>
        {steps.map((s, i) => {
          const isDone    = completedIds.has(s.id);
          const isActive  = !isSkipped && i === current && !isDone;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: "50%",
                  border: `2px solid ${isDone ? "#0d9488" : isActive ? "#0d9488" : "#d1d5db"}`,
                  background: isDone ? "#0d9488" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.3s ease",
                  boxShadow: isActive ? "0 0 0 3px rgba(13,148,136,0.15)" : "none",
                }}
              >
                {isDone ? (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4l2 2L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isActive ? (
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#0d9488" }} />
                ) : null}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: isDone ? "#9ca3af" : isActive ? "#0d9488" : "#374151",
                  fontWeight: isDone ? 400 : isActive ? 600 : 500,
                  textDecoration: isDone ? "line-through" : "none",
                }}
              >
                {s.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Resume button – only shown when guide is skipped */}
      {isSkipped && (
        <button
          onClick={onResume}
          style={{
            width: "100%",
            height: 38,
            borderRadius: 9,
            border: "none",
            background: "linear-gradient(135deg,#2dd4bf 0%,#0d9488 100%)",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(13,148,136,0.3)",
          }}
        >
          Continue Setup →
        </button>
      )}
    </div>
  );
}

// ─── All-done celebration modal ───────────────────────────────

function SetupCompleteModal({ onClose }: { onClose: () => void }) {
  return (
    <div
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

        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 12, letterSpacing: "-0.03em" }}>
          Workspace Ready!
        </h2>

        <p style={{ fontSize: 15, lineHeight: 1.7, color: "#4b5563", marginBottom: 36 }}>
          You've completed your workspace setup. Your team can now submit
          expenses, and approvals will flow through your policies automatically.
        </p>

        <button
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
        width: 400,
        maxWidth: "calc(100vw - 32px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.46,0.64,1)",
      };

  return (
    <div style={wrapStyle}>
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

          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 10, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
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
                Complete this action first — the arrow above shows exactly which button to click.
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

  const [visible,       setVisible]       = useState(false);
  const [cardVisible,   setCardVisible]   = useState(false);
  const [stepIndex,     setStepIndex]     = useState(0);
  const [completedIds,  setCompletedIds]  = useState<Set<string>>(new Set());
  const [isSkipped,     setIsSkipped]     = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [waitingForAction, setWaitingForAction] = useState(true);

  const SETTLE_MS = 700;
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── Restore persisted progress on mount ───────────────────
  useEffect(() => {
    if (!userId) return;
    const restored = new Set<string>();
    SETUP_STEPS.forEach((s) => {
      if (sessionStorage.getItem(STEP_DONE_KEY(userId, s.id)) === "1")
        restored.add(s.id);
    });
    setCompletedIds(restored);

    // If user already finished all steps before this session, skip entirely
    if (completedKey && sessionStorage.getItem(completedKey) === "1") {
      setVisible(false);
      return;
    }

    // Find first incomplete step
    const firstIncomplete = SETUP_STEPS.findIndex((s) => !restored.has(s.id));
    if (firstIncomplete === -1) return; // all done
    setStepIndex(firstIncomplete);

    // Check if previously dismissed (skipped)
    if (dismissedKey && sessionStorage.getItem(dismissedKey) === "1") {
      setIsSkipped(true);
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start guide after password modal ──────────────────────
  useEffect(() => {
    if (!isEligible || !setupGuideReady) return;
    if (dismissedKey && sessionStorage.getItem(dismissedKey) === "1") return;
    if (completedKey && sessionStorage.getItem(completedKey) === "1") return;

    const t = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setCardVisible(true));
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

    if (pathname !== step.navigateTo || (targetTab && currTab !== targetTab)) {
      router.push(targetUrl);
      return;
    }

    setCardVisible(false);
    setWaitingForAction(!completedIds.has(step.id));
    pendingRef.current = setTimeout(() => setCardVisible(true), SETTLE_MS);
    return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
  }, [pathname, searchParams, stepIndex, visible, isSkipped]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Silent action detection ───────────────────────────────
  // Pages dispatch custom events after successful actions.
  // We listen and tick silently even if guide is skipped.
  const markStepDone = useCallback(
    (stepId: string) => {
      setCompletedIds((prev) => {
        if (prev.has(stepId)) return prev;
        const next = new Set(prev);
        next.add(stepId);
        if (userId) sessionStorage.setItem(STEP_DONE_KEY(userId, stepId), "1");

        // Check if all done
        const allDone = SETUP_STEPS.every((s) => next.has(s.id));
        if (allDone) {
          if (completedKey) sessionStorage.setItem(completedKey, "1");
          setIsSkipped(false);
          setVisible(true);
          setTimeout(() => setShowDoneModal(true), 400);
        }
        return next;
      });

      // If this is the current step in the active guide, advance after tick
      setStepIndex((cur) => {
        if (SETUP_STEPS[cur]?.id === stepId) {
          setWaitingForAction(false);
          setTimeout(() => {
            const next = cur + 1;
            if (next < SETUP_STEPS.length) {
              setCardVisible(false);
              setTimeout(() => setStepIndex(next), 280);
            }
          }, 800);
        }
        return cur;
      });
    },
    [userId, completedKey]
  );

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
      if (dismissedKey) sessionStorage.setItem(dismissedKey, "1");
    }, 300);
  }, [dismissedKey]);

  const resumeGuide = useCallback(() => {
    setIsSkipped(false);
    if (dismissedKey) sessionStorage.removeItem(dismissedKey);
    setVisible(true);
    requestAnimationFrame(() => setCardVisible(true));
  }, [dismissedKey]);

  // ── Close (X button) → same as skip ──────────────────────
  const handleClose = useCallback(() => skipGuide(), [skipGuide]);

  // ── Keyboard ──────────────────────────────────────────────
  useEffect(() => {
    if (!visible || isSkipped) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skipGuide(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, isSkipped, skipGuide]);

  // ── Tooltip position ──────────────────────────────────────
  const pos = useTooltipPosition(
    !isSkipped ? step?.targetSelector : undefined,
    !isSkipped ? (step?.arrowSide ?? "none") : "none"
  );

  // ── Completion modal close ────────────────────────────────
  const handleDoneClose = useCallback(() => {
    setShowDoneModal(false);
    setVisible(false);
    router.push("/dashboard");
  }, [router]);

  // ── Render guards ─────────────────────────────────────────
  if (!isEligible || !userId) return null;

  const allDone = SETUP_STEPS.every((s) => completedIds.has(s.id));
  if (allDone && !showDoneModal) return null;

  const showProgress = visible || isSkipped;

  return (
    <SetupGuideContext.Provider value={{ markStepDone }}>
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
        />
      )}

      {/* Only render overlay + card when guide is open (not skipped) */}
      {visible && !isSkipped && step && (
        <>
          {/* Click-blocking layer */}
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

          {/* SVG spotlight overlay */}
          <SpotlightOverlay
            sidebarHref={step.sidebarHref}
            targetSelector={step.targetSelector}
            visible={cardVisible}
          />

          {/* Bouncing pointer arrow */}
          {step.targetSelector && step.arrowSide && step.arrowSide !== "none" && (
            <PointerArrow
              targetSelector={step.targetSelector}
              side={step.arrowSide}
            />
          )}

          {/* Step card */}
          <SetupCard
            step={step}
            stepNumber={stepIndex + 1}
            totalSteps={SETUP_STEPS.length}
            pos={pos}
            visible={cardVisible}
            isDone={completedIds.has(step.id)}
            waitingForAction={waitingForAction && !completedIds.has(step.id)}
            onSkip={skipGuide}
            onClose={handleClose}
          />
        </>
      )}
    </SetupGuideContext.Provider>
  );
}
