"use client";

/**
 * VilletoSetupGuide  (v2 — full UX rewrite)
 * ─────────────────────────────────────────────────────────────
 * Key changes from v1:
 *
 *  [UX-1] 5 steps only (directory, invitations, expense-category,
 *          policy, account-details). "report" removed.
 *          Final step navigates to /expenses?tab=personal but never
 *          forces report creation.
 *
 *  [UX-2] Invite Users flow — zero blocking overlay at any point.
 *         Phase 0 "idle"   — card + arrow → [data-tour="invite-button"]
 *         Phase 1 "dropdown-open" — card hidden, overlay gone,
 *                 arrow → [data-tour="invite-dropdown-menu"]
 *         Phase 2a/2b — sub-state inline arrows on the respective pages.
 *
 *  [UX-3] Tick on EITHER employee OR leadership invite (first one wins).
 *
 *  [UX-4] "Skip Setup" always rendered on every card.
 *
 *  [UX-5] Warning modals are never covered — overlay cleared first.
 *
 *  All original bug-fixes FIX-1…FIX-6 preserved.
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

type StepSubState = {
  pathMatch: (pathname: string, sp: URLSearchParams) => boolean;
  targetSelector?: string;
  mergeSelectors?: string[];
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
  targetSelector?: string;
  mergeSelectors?: string[];
  arrowSide?: ArrowSide;
  title: string;
  description: string;
  completionEvent?: string;
  allowedSubPaths?: string[];
  subStates?: StepSubState[];
  allowInteraction?: boolean;
  disableSpotlight?: boolean;
};

// ─── Step definitions (5 steps) ──────────────────────────────

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
      'Let\'s get your team into Villeto. Click the "Upload Directory" button highlighted above to start importing your employee list.',
    completionEvent: "villeto:directory-uploaded",
    allowedSubPaths: ["/people/invite/employees"],
    subStates: [
      {
        pathMatch: (pn, sp) =>
          pn.startsWith("/people/invite/employees") &&
          (sp.get("step") === "upload" || !sp.get("step")),
        targetSelector: '[data-tour="csv-upload-zone"]',
        mergeSelectors: ['[data-tour="download-template-link"]'],
        arrowSide: "top",
        title: "Drop Your CSV File Here",
        description:
          'Drag your CSV or Excel file into the upload area — or click "Browse File" to pick it from your computer.\n\nNot sure of the format? Click "Download a Template" (highlighted top-right) to get a ready-made CSV you can fill in.',
      },
      {
        pathMatch: (pn, sp) =>
          pn.startsWith("/people/invite/employees") &&
          sp.get("step") === "preview",
        targetSelector: '[data-tour="save-to-directory-button"]',
        arrowSide: "top",
        title: "Review & Save to Directory",
        description:
          'Your employees are loaded! Give them a quick look — remove any mistakes — then click "Save to Directory" to add them to your workspace.',
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
      'Click "Invite Users" and select either "Invite Employees" or "Invite Leadership & Admin".\n\nSending at least one invitation will complete this step.',
    completionEvent: "villeto:invitation-sent",
    allowedSubPaths: ["/people/invite/employees", "/people/invite/leadership"],
    // Always interactive — no full overlay on this step
    allowInteraction: true,
    disableSpotlight: false,
    subStates: [
      {
        // Employees directory picker
        pathMatch: (pn, sp) =>
          pn.startsWith("/people/invite/employees") &&
          sp.get("step") !== "upload" &&
          sp.get("step") !== "preview",
        targetSelector: '[data-tour="send-invitations-button"]',
        arrowSide: "top",
        title: "Select & Invite Employees",
        description:
          "Use the checkbox in the header to select all, or tick employees one by one.\n\nThen click the Invite button (arrow below) to send invitations.",
        allowInteraction: true,
        disableSpotlight: true,
      },
      {
        // Leadership form
        pathMatch: (pn) => pn.startsWith("/people/invite/leadership"),
        targetSelector: '[data-tour="leadership-add-user-button"]',
        arrowSide: "top",
        title: "Invite Leadership & Admin",
        description:
          'Enter the user\'s email, select their role, then click "Add User".\n\nOnce they appear in the list on the right, click "Send Invitation" to complete.',
        allowInteraction: true,
        disableSpotlight: true,
      },
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
    allowInteraction: true,
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
    allowInteraction: true,
    completionEvent: "villeto:policy-created",
  },
  {
    id: "account-details",
    navigateTo: "/settings/personal-settings",
    navigateUrl: "/settings/personal-settings?section=account-details",
    sidebarHref: "/settings",
    targetSelector: '[data-tour="update-details-button"]',
    arrowSide: "bottom",
    title: "Set Up Account Details",
    description:
      "Add your bank details so reimbursements can be paid directly to you. Your name must match the company directory.",
    completionEvent: "villeto:account-details-saved",
    // Step 5 is interactive — the user clicks the button through the overlay.
    allowInteraction: true,
    disableSpotlight: false,
  },
];

const BONUS_STEP: SetupStep = {
  id: "bonus-report",
  navigateTo: "/expenses",
  navigateUrl: "/expenses?tab=personal-expenses",
  sidebarHref: "/expenses",
  targetSelector: '[data-tour="new-report-button"]',
  arrowSide: "top",
  title: "Create Your First Report",
  description:
    "You're all set! Now you can start adding your business expenses. Click the button above to create your first report.",
  allowInteraction: true,
  disableSpotlight: false,
};

// ─── Session-storage keys ─────────────────────────────────────

const POST_SETUP_DISMISSED_KEY = (uid: string) => `villeto-post-setup-dismissed:${uid}`;
const GUIDE_DISMISSED_KEY = (uid: string) =>
  `villeto-setup-guide-dismissed:${uid}`;
const GUIDE_COMPLETED_KEY = (uid: string) =>
  `villeto-setup-guide-complete:${uid}`;
const STEP_DONE_KEY = (uid: string, stepId: string) =>
  `villeto-setup-step:${uid}:${stepId}`;

// ─── Silent completion context ────────────────────────────────

export const SetupGuideContext = createContext<{
  markStepDone: (stepId: string) => void;
} | null>(null);

export function useSetupGuide() {
  return useContext(SetupGuideContext);
}

// ─── Helpers ─────────────────────────────────────────────────

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

// ─── SVG Spotlight overlay ────────────────────────────────────

function SpotlightOverlay({
  sidebarHref,
  targetSelector,
  mergeSelectors,
  visible,
}: {
  sidebarHref?: string;
  targetSelector?: string;
  mergeSelectors?: string[];
  visible: boolean;
}) {
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [sidebarSpot, setSidebarSpot] = useState<
    (SpotRect & { sidebarW: number }) | null
  >(null);
  const [targetSpot, setTargetSpot] = useState<SpotRect | null>(null);
  const [mergeSpots, setMergeSpots] = useState<SpotRect[]>([]);

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
    setTargetSpot(targetSelector ? measureEl(targetSelector) : null);
    setMergeSpots(
      (mergeSelectors ?? []).map((s) => measureEl(s)).filter((r): r is SpotRect => r !== null)
    );
  }, [sidebarHref, targetSelector, mergeSelectors]);

  useEffect(() => {
    measure();
    const iv = setInterval(measure, 150);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearInterval(iv);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  if (vp.w === 0) return null;
  const { w, h } = vp;
  const SP = 6, TP = 8;
  const outer = `M0 0 L${w} 0 L${w} ${h} L0 ${h}Z`;
  const sHole = sidebarSpot
    ? `M0 ${sidebarSpot.top - SP} L${sidebarSpot.sidebarW} ${sidebarSpot.top - SP} L${sidebarSpot.sidebarW} ${sidebarSpot.bottom + SP} L0 ${sidebarSpot.bottom + SP}Z`
    : "";

  let tHole = "", tBorderPoints = "";
  if (targetSpot) {
    const extra = mergeSpots[0] ?? null;
    if (extra) {
      const mL = targetSpot.left - TP, mR = targetSpot.right + TP;
      const mT = targetSpot.top - TP, mB = targetSpot.bottom + TP;
      const eL = extra.left - TP, eT = extra.top - TP;
      const eR = Math.max(extra.right, targetSpot.right) + TP;
      tHole = `M${mL} ${mB} L${mL} ${mT} L${eL} ${mT} L${eL} ${eT} L${eR} ${eT} L${eR} ${mT} L${mR} ${mT} L${mR} ${mB} Z`;
      tBorderPoints = `${mL},${mB} ${mL},${mT} ${eL},${mT} ${eL},${eT} ${eR},${eT} ${eR},${mT} ${mR},${mT} ${mR},${mB}`;
    } else {
      const l = targetSpot.left - TP, r = targetSpot.right + TP;
      const t = targetSpot.top - TP, b = targetSpot.bottom + TP;
      tHole = `M${l} ${t} L${r} ${t} L${r} ${b} L${l} ${b}Z`;
      tBorderPoints = `${l},${t} ${r},${t} ${r},${b} ${l},${b}`;
    }
  }

  return (
    <svg aria-hidden style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 40, pointerEvents: "none", opacity: visible ? 1 : 0, transition: "opacity 0.35s ease" }}>
      <path fillRule="evenodd" d={[outer, sHole, tHole].filter(Boolean).join(" ")} fill="rgba(0,0,0,0.52)" />
      {sidebarSpot && <rect x={0} y={sidebarSpot.top - SP} width={sidebarSpot.sidebarW} height={sidebarSpot.bottom - sidebarSpot.top + SP * 2} fill="none" stroke="rgba(13,148,136,0.8)" strokeWidth={2} rx={8} style={{ filter: "drop-shadow(0 0 6px rgba(13,148,136,0.55))" }} />}
      {targetSpot && tBorderPoints && <polygon points={tBorderPoints} fill="none" stroke="rgba(13,148,136,0.8)" strokeWidth={2} strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(13,148,136,0.55))" }} />}
    </svg>
  );
}

// ─── Animated pointer arrow ───────────────────────────────────

function PointerArrow({ targetSelector, side = "top" }: { targetSelector?: string; side?: ArrowSide }) {
  const [pos, setPos] = useState<{ x: number; y: number; effectiveSide: ArrowSide } | null>(null);

  const compute = useCallback(() => {
    if (!targetSelector || side === "none") { setPos(null); return; }
    const rect = measureEl(targetSelector);
    if (!rect) { setPos(null); return; }
    const TP = 8, GAP = 30, MIN = 50;
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = 0, y = 0, effectiveSide: ArrowSide = side;
    switch (side) {
      case "top": {
        const yAbove = rect.top - TP - GAP;
        y = yAbove > MIN ? (effectiveSide = "top", yAbove) : (effectiveSide = "bottom", rect.bottom + TP + GAP);
        x = Math.min(Math.max((rect.left + rect.right) / 2, MIN), vw - MIN);
        break;
      }
      case "bottom": {
        const yBelow = rect.bottom + TP + GAP;
        y = yBelow < vh - MIN ? (effectiveSide = "bottom", yBelow) : (effectiveSide = "top", rect.top - TP - GAP);
        x = Math.min(Math.max((rect.left + rect.right) / 2, MIN), vw - MIN);
        break;
      }
      case "left": {
        const xLeft = rect.left - TP - GAP;
        x = xLeft > MIN ? (effectiveSide = "left", xLeft) : (effectiveSide = "right", rect.right + TP + GAP);
        y = Math.min(Math.max((rect.top + rect.bottom) / 2, MIN), vh - MIN);
        break;
      }
      case "right": {
        const xRight = rect.right + TP + GAP;
        x = xRight < vw - MIN ? (effectiveSide = "right", xRight) : (effectiveSide = "left", rect.left - TP - GAP);
        y = Math.min(Math.max((rect.top + rect.bottom) / 2, MIN), vh - MIN);
        break;
      }
      default: setPos(null); return;
    }
    setPos({ x, y, effectiveSide });
  }, [targetSelector, side]);

  useEffect(() => {
    compute();
    const iv = setInterval(compute, 150);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => { clearInterval(iv); window.removeEventListener("resize", compute); window.removeEventListener("scroll", compute, true); };
  }, [compute]);

  if (!pos) return null;
  const arrowPath = (s: ArrowSide) => {
    switch (s) {
      case "top":    return "M0,14 L-11,-9 L0,-4 L11,-9 Z";
      case "bottom": return "M0,-14 L-11,9 L0,4 L11,9 Z";
      case "left":   return "M14,0 L-9,-11 L-4,0 L-9,11 Z";
      case "right":  return "M-14,0 L9,-11 L4,0 L9,11 Z";
      default:       return "";
    }
  };
  const effectiveSide = pos.effectiveSide || "none";
  if (effectiveSide === "none") return null;

  const an = `va-${effectiveSide}`;
  const dx = effectiveSide === "left" ? 6 : effectiveSide === "right" ? -6 : 0;
  const dy = effectiveSide === "top" ? 6 : effectiveSide === "bottom" ? -6 : 0;
  return (
    <svg aria-hidden style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 45, pointerEvents: "none", overflow: "visible" }}>
      <style>{`@keyframes ${an}-kf{0%,100%{transform:translate(${pos.x}px,${pos.y}px)}50%{transform:translate(${pos.x+dx}px,${pos.y+dy}px)}}.${an}-arrow{animation:${an}-kf 1s ease-in-out infinite}`}</style>
      <g className={`${an}-arrow`}>
        <path d={arrowPath(effectiveSide)} fill="#0d9488" stroke="white" strokeWidth="1.5" strokeLinejoin="round" style={{ filter: "drop-shadow(0 2px 8px rgba(13,148,136,0.7))" }} />
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
  effectiveSide?: ArrowSide;
};

function useTooltipPosition(selector: string | undefined, arrowSide: ArrowSide = "none"): TooltipPos {
  const [pos, setPos] = useState<TooltipPos>({ placement: "center", targetMissing: !!selector });

  const compute = useCallback(() => {
    if (!selector || arrowSide === "none") { setPos(p => p.placement === "center" && !p.targetMissing ? p : { placement: "center", targetMissing: false, effectiveSide: "none" }); return; }
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) { setPos(p => p.placement === "center" && p.targetMissing ? p : { placement: "center", targetMissing: true, effectiveSide: "none" }); return; }
    const rect = el.getBoundingClientRect();
    const CARD_W = 400, GAP = 56;
    const CARD_H_EST = 380; // Estimated height for boundary checks

    let next: TooltipPos = { placement: "center", targetMissing: false, effectiveSide: "none" };
    let side = arrowSide;

    // Boundary check + Auto-flip
    if (side === "top" && (rect.bottom + GAP + CARD_H_EST > window.innerHeight)) {
      side = "bottom";
    } else if (side === "bottom" && (rect.top - GAP - CARD_H_EST < 0)) {
      side = "top";
    }

    if (side === "top") {
      let left = Math.max(12, Math.min(rect.left + rect.width / 2 - CARD_W / 2, window.innerWidth - CARD_W - 12));
      next = { top: rect.bottom + GAP, left, arrowLeft: rect.left + rect.width / 2 - left, placement: "near-target", targetMissing: false, effectiveSide: "top" };
    } else if (side === "bottom") {
      let left = Math.max(12, Math.min(rect.left + rect.width / 2 - CARD_W / 2, window.innerWidth - CARD_W - 12));
      // Using fixed positioning relative to bottom if we can't accurately get height, 
      // but rect.top - GAP - height is standard.
      next = { top: Math.max(12, rect.top - GAP - CARD_H_EST), left, arrowLeft: rect.left + rect.width / 2 - left, placement: "near-target", targetMissing: false, effectiveSide: "bottom" };
    } else if (side === "left") {
      let top = Math.max(12, Math.min(rect.top + rect.height / 2 - 100, window.innerHeight - 300));
      next = { top, left: rect.right + GAP, arrowTop: rect.top + rect.height / 2 - top, placement: "near-target", targetMissing: false, effectiveSide: "left" };
    } else if (side === "right") {
      let top = Math.max(12, Math.min(rect.top + rect.height / 2 - 100, window.innerHeight - 300));
      next = { top, left: rect.left - CARD_W - GAP, arrowTop: rect.top + rect.height / 2 - top, placement: "near-target", targetMissing: false, effectiveSide: "right" };
    }
    
    setPos(p => {
      if (p.placement === next.placement && 
          p.top === next.top && 
          p.left === next.left && 
          p.effectiveSide === next.effectiveSide &&
          p.targetMissing === next.targetMissing) return p;
      return next;
    });
  }, [selector, arrowSide]);

  useEffect(() => {
    compute();
    const iv = setInterval(compute, 150);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => { clearInterval(iv); window.removeEventListener("resize", compute); window.removeEventListener("scroll", compute, true); };
  }, [compute]);

  return pos;
}

// ─── Progress sidebar widget ──────────────────────────────────

function SetupProgressWidget({ steps, completedIds, current, onResume, isSkipped, isActive }: { steps: SetupStep[]; completedIds: Set<string>; current: number; onResume: () => void; isSkipped: boolean; isActive: boolean }) {
  const done = steps.filter(s => completedIds.has(s.id)).length;
  const total = steps.length;
  const pct = Math.round((done / total) * 100);

  if (!isActive) {
    return (
      <div role="button" tabIndex={0} aria-label={`Workspace Setup — ${done} of ${total} steps complete. Click to continue.`} onClick={onResume} onKeyDown={e => e.key === "Enter" && onResume()} style={{ position: "fixed", bottom: 24, left: "calc(var(--sidebar-width, 240px) + 16px)", zIndex: 20, background: "white", borderRadius: 99, padding: "10px 12px 10px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "box-shadow 0.2s, transform 0.15s", userSelect: "none" }} onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(13,148,136,0.18), 0 2px 6px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }} onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>Workspace Setup</span>
            <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>{done}/{total}</span>
          </div>
          <div style={{ height: 4, borderRadius: 99, background: "#e5f9f7", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#2dd4bf,#0d9488)", borderRadius: 99, transition: "width 0.5s ease" }} />
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onResume(); }} style={{ flexShrink: 0, height: 34, borderRadius: 99, border: "none", background: "linear-gradient(135deg,#2dd4bf 0%,#0d9488 100%)", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "0 14px", boxShadow: "0 3px 10px rgba(13,148,136,0.35)", whiteSpace: "nowrap", transition: "opacity 0.15s" }} onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")} onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}>Continue Setup →</button>
      </div>
    );
  }

  return (
    <div aria-label="Setup progress" style={{ position: "fixed", bottom: 24, left: 24, zIndex: 45, background: "white", borderRadius: 16, padding: "18px 22px", boxShadow: "0 4px 24px rgba(0,0,0,0.14), 0 1px 6px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.07)", minWidth: 240, maxWidth: 280 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>Workspace Setup</p>
        <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{done}/{total}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "#e5f9f7", marginBottom: 12, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#2dd4bf,#0d9488)", borderRadius: 99, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s, i) => {
          const isDone = completedIds.has(s.id);
          const isStepActive = i === current && !isDone;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${isDone ? "#0d9488" : isStepActive ? "#0d9488" : "#d1d5db"}`, background: isDone ? "#0d9488" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s ease", boxShadow: isStepActive ? "0 0 0 3px rgba(13,148,136,0.15)" : "none" }}>
                {isDone ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> : isStepActive ? <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#0d9488" }} /> : null}
              </div>
              <span style={{ fontSize: 12, color: isDone ? "#9ca3af" : isStepActive ? "#0d9488" : "#374151", fontWeight: isDone ? 400 : isStepActive ? 600 : 500, textDecoration: isDone ? "line-through" : "none" }}>{s.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── All-done celebration modal ───────────────────────────────

function SetupCompleteModal({ onClose }: { onClose: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { btnRef.current?.focus(); }, []);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="setup-complete-heading" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }}>
      <div style={{ background: "white", borderRadius: 24, padding: "48px 40px 40px", maxWidth: 440, width: "calc(100vw - 48px)", boxShadow: "0 32px 80px rgba(0,0,0,0.22)", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 20, lineHeight: 1 }}>🎉</div>
        <h2 id="setup-complete-heading" style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 12, letterSpacing: "-0.03em" }}>Workspace Ready!</h2>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "#4b5563", marginBottom: 36 }}>You've completed your workspace setup. Your team can now submit expenses, and approvals will flow through your policies automatically.</p>
        <button ref={btnRef} onClick={onClose} style={{ width: "100%", height: 50, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#2dd4bf 0%,#0d9488 100%)", color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 20px rgba(13,148,136,0.4)" }}>Create New Report</button>
      </div>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────

function SetupCard({ step, stepNumber, totalSteps, pos, visible, isDone, waitingForAction, onSkip, onClose }: { step: SetupStep; stepNumber: number; totalSteps: number; pos: TooltipPos; visible: boolean; isDone: boolean; waitingForAction: boolean; onSkip: () => void; onClose: () => void }) {
  const isCentered = pos.placement === "center";
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (visible) { const t = setTimeout(() => cardRef.current?.focus(), 50); return () => clearTimeout(t); }
  }, [visible]);

  const wrapStyle: React.CSSProperties = isCentered
    ? { position: "fixed", top: "50%", left: "50%", transform: visible ? "translate(-50%,-50%) scale(1)" : "translate(-50%,-50%) scale(0.94)", zIndex: 45, width: 420, maxWidth: "calc(100vw - 32px)", opacity: visible ? 1 : 0, transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.46,0.64,1)" }
    : { position: "fixed", top: pos.top, left: pos.left, zIndex: 45, width: 400, maxWidth: "calc(100vw - 32px)", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-8px)", transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.46,0.64,1)" };

  return (
    <div ref={cardRef} role="dialog" aria-modal="true" aria-labelledby="setup-card-heading" tabIndex={-1} style={{ ...wrapStyle, outline: "none" }}>
      {pos.effectiveSide === "top" && pos.arrowLeft !== undefined && <div style={{ position: "absolute", top: -10, left: pos.arrowLeft - 10, width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderBottom: "10px solid white", filter: "drop-shadow(0 -2px 3px rgba(0,0,0,0.07))", zIndex: 1 }} />}
      {pos.effectiveSide === "bottom" && pos.arrowLeft !== undefined && <div style={{ position: "absolute", bottom: -10, left: pos.arrowLeft - 10, width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "10px solid white", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.07))", zIndex: 1 }} />}
      {pos.effectiveSide === "left" && pos.arrowTop !== undefined && <div style={{ position: "absolute", top: pos.arrowTop - 10, left: -10, width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderRight: "10px solid white", filter: "drop-shadow(-2px 0 3px rgba(0,0,0,0.07))", zIndex: 1 }} />}
      {pos.effectiveSide === "right" && pos.arrowTop !== undefined && <div style={{ position: "absolute", top: pos.arrowTop - 10, right: -10, width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "10px solid white", filter: "drop-shadow(2px 0 3px rgba(0,0,0,0.07))", zIndex: 1 }} />}
      <div style={{ background: "white", borderRadius: 18, boxShadow: "0 24px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden", maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "26px 28px 24px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#0d9488", background: "#f0fdf9", padding: "3px 10px", borderRadius: 99 }}>Step {stepNumber} of {totalSteps}</span>
            <button onClick={onClose} aria-label="Close setup guide" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "#9ca3af", lineHeight: 1, transition: "color 0.2s" }} onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#374151")} onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#9ca3af")}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
          <h2 id="setup-card-heading" style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 10, letterSpacing: "-0.02em", lineHeight: 1.25 }}>{step.title}</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#4b5563", marginBottom: 22, whiteSpace: "pre-line" }}>{step.description}</p>

          {waitingForAction && !isDone && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><path d="M8 1.5L1 14h14L8 1.5z" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 6v4M8 11.5v.5" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" /></svg>
              <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5, margin: 0 }}>Follow the arrow — it points to the exact button you need to click to complete this step.</p>
            </div>
          )}

          {isDone && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf9", border: "1px solid #a7f3d0", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#0d9488" /><path d="M4.5 8l2.5 2.5L11 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <p style={{ fontSize: 12, color: "#065f46", lineHeight: 1.5, margin: 0, fontWeight: 600 }}>Step completed! Advancing…</p>
            </div>
          )}

          <div style={{ height: 1, background: "#f3f4f6", marginBottom: 18 }} />

          {/* Skip is ALWAYS visible */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onSkip} style={{ flex: 1, height: 42, borderRadius: 10, border: "1.5px solid #e5e7eb", background: "white", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "border-color 0.2s" }} onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#0d9488")} onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb")}>
              Skip Setup
            </button>
            <button disabled style={{ flex: 2, height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#2dd4bf 0%,#0d9488 100%)", color: "white", fontSize: 13, fontWeight: 600, opacity: 0.45, cursor: "not-allowed", position: "relative" }} title="Complete the action above to proceed">
              <span>Waiting for action…</span>
              <span style={{ position: "absolute", top: 10, right: 12, width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.7)", animation: "villeto-pulse 1.4s ease-in-out infinite" }} />
              <style>{`@keyframes villeto-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.7)}}`}</style>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invite dropdown tip ──────────────────────────────────────
// Shown when overlay is cleared and dropdown is open.

function InviteDropdownTip({ onSkip }: { onSkip: () => void }) {
  return (
    <>
      <PointerArrow targetSelector='[data-tour="invite-dropdown-menu"]' side="top" />
      <div style={{ position: "fixed", bottom: 100, right: 24, zIndex: 45, background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.14)", border: "1px solid rgba(13,148,136,0.15)", maxWidth: 300, animation: "villeto-slide-up 0.3s ease" }}>
        <style>{`@keyframes villeto-slide-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 6px" }}>👆 Choose an invite type</p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.5 }}>
          Select <strong style={{ color: "#374151" }}>Invite Employees</strong> or <strong style={{ color: "#374151" }}>Invite Leadership & Admin</strong> from the menu above.
        </p>
        <button onClick={onSkip} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}>Skip Setup</button>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function VilletoSetupGuide() {
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setTourActive = useTourStore(s => s.setTourActive);
  const setupGuideReady = useTourStore(s => (s as any).setupGuideReady ?? false);

  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isSkipped, setIsSkipped] = useState(false);
  const [isPostSetupDismissed, setIsPostSetupDismissed] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [waitingForAction, setWaitingForAction] = useState(true);
  const [inviteDropdownOpen, setInviteDropdownOpen] = useState(false);

  const pendingRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepIndexRef = useRef(0);
  const allDoneRef   = useRef(false);

  const isEligible =
    user?.position === "CONTROLLING_OFFICER" &&
    !!user?.createdAt &&
    user.createdAt === user?.company?.createdAt;

  const userId       = user?.userId ?? "";
  const dismissedKey = userId ? GUIDE_DISMISSED_KEY(userId) : null;
  const completedKey = userId ? GUIDE_COMPLETED_KEY(userId)  : null;

  // [FIX-3] Keep stepIndexRef in sync
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);

  // Restore persisted progress
  useEffect(() => {
    if (!userId) return;
    const restored = new Set<string>();
    SETUP_STEPS.forEach(s => { if (localStorage.getItem(STEP_DONE_KEY(userId, s.id)) === "1") restored.add(s.id); });
    setCompletedIds(restored);
    if (completedKey && localStorage.getItem(completedKey) === "1") { 
      allDoneRef.current = true; 
      // We don't return early here anymore because we might need to show the bonus step
    }
    const firstIncomplete = SETUP_STEPS.findIndex(s => !restored.has(s.id));
    if (firstIncomplete !== -1) setStepIndex(firstIncomplete);
    
    if (dismissedKey && localStorage.getItem(dismissedKey) === "1") setIsSkipped(true);
    if (userId && localStorage.getItem(POST_SETUP_DISMISSED_KEY(userId)) === "1") setIsPostSetupDismissed(true);
    setHydrated(true);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start guide after password modal
  useEffect(() => {
    if (!isEligible || !setupGuideReady) return;
    if (dismissedKey && localStorage.getItem(dismissedKey) === "1") return;
    if (completedKey && localStorage.getItem(completedKey) === "1") return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [isEligible, setupGuideReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Broadcast to sidebar
  useEffect(() => { setTourActive(visible && !isSkipped); return () => setTourActive(false); }, [visible, isSkipped, setTourActive]);

  const step = SETUP_STEPS[stepIndex];

  // Navigation effect
  useEffect(() => {
    if (!visible || isSkipped || !step) return;
    if (pendingRef.current) clearTimeout(pendingRef.current);
    setInviteDropdownOpen(false);

    const targetUrl = step.navigateUrl ?? step.navigateTo;
    const tabMatch = targetUrl.match(/tab=([^&]+)/);
    const targetTab = tabMatch ? tabMatch[1] : null;
    const currTab = searchParams.get("tab");
    const isOnAllowedSubPath = step.allowedSubPaths?.some(p => pathname.startsWith(p)) ?? false;

    if (!isOnAllowedSubPath && (pathname !== step.navigateTo || (targetTab && currTab !== targetTab))) {
      setCardVisible(false);
      router.push(targetUrl);
      return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
    }

    setCardVisible(false);
    setWaitingForAction(!completedIds.has(step.id));
    pendingRef.current = setTimeout(() => setCardVisible(true), 400);
    return () => { if (pendingRef.current) clearTimeout(pendingRef.current); };
  }, [pathname, searchParams, stepIndex, visible, isSkipped]); // eslint-disable-line react-hooks/exhaustive-deps

  // [FIX-2] Completion detection
  useEffect(() => {
    if (!completedIds.size) return;
    const allDone = SETUP_STEPS.every(s => completedIds.has(s.id));
    if (!allDone || allDoneRef.current) return;
    if (completedKey && localStorage.getItem(completedKey) === "1") { allDoneRef.current = true; return; }
    allDoneRef.current = true;
    if (completedKey) localStorage.setItem(completedKey, "1");
    setIsSkipped(false);
    setVisible(true);
    const t = setTimeout(() => setShowDoneModal(true), 400);
    return () => clearTimeout(t);
  }, [completedIds, completedKey]);

  // [FIX-1] markStepDone
  const markStepDone = useCallback((stepId: string) => {
    setCompletedIds(prev => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      if (userId) localStorage.setItem(STEP_DONE_KEY(userId, stepId), "1");
      return next;
    });
    const cur = stepIndexRef.current;
    if (SETUP_STEPS[cur]?.id !== stepId) return;
    setWaitingForAction(false);
    setInviteDropdownOpen(false);
    if (advanceRef.current) clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => {
      const next = cur + 1;
      if (next < SETUP_STEPS.length) {
        setCardVisible(false);
        advanceRef.current = setTimeout(() => setStepIndex(next), 280);
      }
    }, 800);
  }, [userId]);

  useEffect(() => { return () => { if (advanceRef.current) clearTimeout(advanceRef.current); }; }, []);

  // Listen for custom events
  useEffect(() => {
    const handlers: Array<{ event: string; fn: EventListener }> = [];
    SETUP_STEPS.forEach(s => {
      if (!s.completionEvent) return;
      const fn = () => markStepDone(s.id);
      window.addEventListener(s.completionEvent, fn);
      handlers.push({ event: s.completionEvent, fn });
    });
    return () => { handlers.forEach(({ event, fn }) => window.removeEventListener(event, fn)); };
  }, [markStepDone]);

  // Listen for invite-button-clicked event to enter dropdown phase
  useEffect(() => {
    if (!visible || isSkipped || step?.id !== "invitations") return;
    const handler = () => {
      // Only on the people list page, not sub-pages
      if (!pathname.startsWith("/people/invite")) {
        setCardVisible(false);
        setInviteDropdownOpen(true);
      }
    };
    window.addEventListener("villeto:invite-button-clicked", handler);
    return () => window.removeEventListener("villeto:invite-button-clicked", handler);
  }, [visible, isSkipped, step?.id, pathname]);

  // Exit dropdown phase on sub-page navigation
  useEffect(() => {
    if (!inviteDropdownOpen) return;
    if (pathname.startsWith("/people/invite/employees") || pathname.startsWith("/people/invite/leadership")) {
      setInviteDropdownOpen(false);
      setCardVisible(false);
      setWaitingForAction(true);
      pendingRef.current = setTimeout(() => setCardVisible(true), 400);
    }
  }, [pathname, inviteDropdownOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Skip / resume
  const skipGuide = useCallback(() => {
    setCardVisible(false);
    setInviteDropdownOpen(false);

    const isCurrentlyBonus = SETUP_STEPS.every(s => completedIds.has(s.id)) && pathname === "/expenses";

    setTimeout(() => {
      setIsSkipped(true);
      if (dismissedKey) localStorage.setItem(dismissedKey, "1");

      // If we are skipping the bonus step specifically, mark it too
      if (isCurrentlyBonus && userId) {
        setIsPostSetupDismissed(true);
        localStorage.setItem(POST_SETUP_DISMISSED_KEY(userId), "1");
      }
    }, 300);
  }, [dismissedKey, pathname, completedIds, userId]);

  const resumeGuide = useCallback(() => {
    setIsSkipped(false);
    if (dismissedKey) localStorage.removeItem(dismissedKey);
    setVisible(true);
  }, [dismissedKey]);

  const handleClose = useCallback(() => skipGuide(), [skipGuide]);

  // [FIX-6] Keyboard
  useEffect(() => {
    if (!visible || isSkipped) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skipGuide(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, isSkipped, skipGuide]);

  // POST-SETUP override logic & activeStep derivation
  const allDone = hydrated ? SETUP_STEPS.every(s => completedIds.has(s.id)) : false;
  let activeStep: SetupStep | undefined = undefined;
  let isBonusActive = false;

  if (allDone) {
    if (pathname === "/expenses" && !isPostSetupDismissed) {
      activeStep = BONUS_STEP;
      isBonusActive = true;
    }
  } else if (step) {
    const activeSubState = step?.subStates?.find(ss => ss.pathMatch(pathname, new URLSearchParams(searchParams.toString())));
    activeStep = activeSubState
      ? { ...step, targetSelector: activeSubState.targetSelector ?? step.targetSelector, mergeSelectors: activeSubState.mergeSelectors ?? step.mergeSelectors, arrowSide: activeSubState.arrowSide ?? step.arrowSide, title: activeSubState.title ?? step.title, description: activeSubState.description ?? step.description, allowInteraction: activeSubState.allowInteraction ?? step.allowInteraction, disableSpotlight: activeSubState.disableSpotlight ?? step.disableSpotlight }
      : step;
  }

  // Tooltip position — suppress when dropdown phase is active
  const pos = useTooltipPosition(
    !isSkipped && !inviteDropdownOpen ? activeStep?.targetSelector : undefined,
    !isSkipped && !inviteDropdownOpen ? (activeStep?.arrowSide ?? "none") : "none"
  );

  // Scroll lock — NEVER lock when allowInteraction is true or dropdown phase active
  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (visible && !isSkipped && activeStep && !activeStep.allowInteraction && !inviteDropdownOpen) {
      document.body.style.overflow = "hidden";
      if (mainEl) mainEl.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      if (mainEl) mainEl.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; if (mainEl) mainEl.style.overflow = ""; };
  }, [visible, isSkipped, activeStep?.allowInteraction, inviteDropdownOpen]);

  // Completion modal close — navigate to expenses personal tab (optional)
  const handleDoneClose = useCallback(() => {
    setShowDoneModal(false);
    // Keep visible so the bonus step can appear on the next page
    setVisible(true);
    setIsSkipped(false);
    router.push("/expenses?tab=personal-expenses");
  }, [router]);

  // Render guards
  if (!isEligible || !userId) return null;
  if (!setupGuideReady) return null;
  if (!activeStep && !showDoneModal && (!allDone || isPostSetupDismissed)) return null;

  const showProgress = !allDone;
  const isInviteStep = !allDone && step?.id === "invitations";

  return (
    <SetupGuideContext.Provider value={{ markStepDone }}>
      <div id="villeto-setup-root">
        {showDoneModal && <SetupCompleteModal onClose={handleDoneClose} />}

        {showProgress && (
          <SetupProgressWidget steps={SETUP_STEPS} completedIds={completedIds} current={stepIndex} onResume={resumeGuide} isSkipped={isSkipped} isActive={visible && !isSkipped} />
        )}

        {visible && !isSkipped && activeStep && (
          <>
            {/* Invite dropdown phase: just tip + arrow, no overlay */}
            {isInviteStep && inviteDropdownOpen && <InviteDropdownTip onSkip={skipGuide} />}

            {/* Normal rendering */}
            {(!isInviteStep || !inviteDropdownOpen) && (
              <>
                {!activeStep.allowInteraction && (
                  <style>{`
                    body,main,.overflow-y-auto,.overflow-auto,.overflow-x-auto{overflow:hidden!important}
                    body{pointer-events:none!important;user-select:none!important}
                    #villeto-setup-root,#villeto-setup-root *{pointer-events:auto!important}
                    [data-radix-popper-content-wrapper],[data-radix-popper-content-wrapper] *,[role="dialog"],[role="dialog"] *,[aria-modal="true"],[aria-modal="true"] *{pointer-events:auto!important}
                    #villeto-setup-root svg,#villeto-setup-root svg *{pointer-events:none!important}
                    ${activeStep.targetSelector ? `${activeStep.targetSelector},${activeStep.targetSelector} *{pointer-events:auto!important;cursor:pointer!important}` : ""}
                    ${(activeStep.mergeSelectors ?? []).map(sel => `${sel},${sel} *{pointer-events:auto!important;cursor:pointer!important}`).join("")}
                  `}</style>
                )}

                {!activeStep.disableSpotlight && (
                  <SpotlightOverlay sidebarHref={activeStep.sidebarHref} targetSelector={activeStep.targetSelector} mergeSelectors={activeStep.mergeSelectors} visible={cardVisible} />
                )}

                {activeStep.targetSelector && activeStep.arrowSide && activeStep.arrowSide !== "none" && (
                  <PointerArrow targetSelector={activeStep.targetSelector} side={activeStep.arrowSide} />
                )}

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
          </>
        )}
      </div>
    </SetupGuideContext.Provider>
  );
}