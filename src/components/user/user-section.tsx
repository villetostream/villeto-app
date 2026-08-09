"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import {
  Bell,
  Bot,
  Calendar as CalendarIcon,
  ChevronDown,
  ArrowLeft,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import Notification from "@/components/notifications/notification";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { format, subDays, startOfMonth, endOfMonth, subMonths, isSameDay, isWithinInterval, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { navigationItems } from "@/components/dashboard/sidebar/sidebar-constants";
import { useDateFilterStore } from "@/stores/useDateFilterStore";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { useAuthStore } from "@/stores/auth-stores";
import NewExpenseHeaderAction from "@/components/expenses/NewExpenseHeaderAction";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";

// ─── Date helpers ────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ─── Preset ranges ───────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Today",       getRange: () => { const t = startOfDay(new Date()); return { from: t, to: t }; } },
  { label: "Yesterday",   getRange: () => { const y = startOfDay(subDays(new Date(),1)); return { from: y, to: y }; } },
  { label: "Last 7 days", getRange: () => ({ from: startOfDay(subDays(new Date(),6)), to: startOfDay(new Date()) }) },
  { label: "Last 30 days",getRange: () => ({ from: startOfDay(subDays(new Date(),29)), to: startOfDay(new Date()) }) },
  { label: "This month",  getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last month",  getRange: () => { const lm = subMonths(new Date(),1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; } },
];

// ─── Mini calendar component ─────────────────────────────────────────────────

interface MiniCalProps {
  year: number;
  month: number;
  selectedFrom?: Date;
  selectedTo?: Date;
  hoverDate?: Date;
  onSelectDay: (d: Date) => void;
  onHoverDay: (d: Date | undefined) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

function MiniCal({ year, month, selectedFrom, selectedTo, hoverDate, onSelectDay, onHoverDay, onPrev, onNext }: MiniCalProps) {
  const totalDays   = daysInMonth(year, month);
  const startOffset = firstDayOfMonth(year, month);
  const cells = Array.from({ length: startOffset + totalDays }, (_, i) =>
    i < startOffset ? null : new Date(year, month, i - startOffset + 1)
  );
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const rangeEnd = selectedFrom && !selectedTo && hoverDate ? hoverDate : selectedTo;
  const rangeFrom = selectedFrom && rangeEnd
    ? (selectedFrom <= rangeEnd ? selectedFrom : rangeEnd)
    : selectedFrom;
  const rangeTo   = selectedFrom && rangeEnd
    ? (selectedFrom <= rangeEnd ? rangeEnd : selectedFrom)
    : undefined;

  const isStart   = (d: Date) => !!selectedFrom && isSameDay(d, selectedFrom);
  const isEnd     = (d: Date) => !!selectedTo   && isSameDay(d, selectedTo);
  const isInRange = (d: Date) => !!rangeFrom && !!rangeTo && isWithinInterval(d, { start: rangeFrom, end: rangeTo }) && !isSameDay(d, rangeFrom) && !isSameDay(d, rangeTo);
  const isToday   = (d: Date) => isSameDay(d, new Date());

  return (
    <div className="select-none w-[256px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        {onPrev ? (
          <button onClick={onPrev} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : <div className="w-7" />}
        <span className="text-sm font-semibold text-foreground">{MONTH_NAMES[month]} {year}</span>
        {onNext ? (
          <button onClick={onNext} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : <div className="w-7" />}
      </div>
      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="h-7 flex items-center justify-center text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const start   = isStart(d);
          const end     = isEnd(d);
          const inRange = isInRange(d);
          const today   = isToday(d);
          return (
            <div
              key={i}
              className={cn(
                "h-8 flex items-center justify-center cursor-pointer text-[13px] transition-colors relative",
                // Range fill
                inRange && "bg-[#f0faf8]",
                // Start cap
                start && "bg-[#f0faf8] rounded-l-full",
                // End cap
                end   && "bg-[#f0faf8] rounded-r-full",
                // Single selection (same day)
                start && end && "rounded-full",
              )}
              onClick={() => onSelectDay(d)}
              onMouseEnter={() => onHoverDay(d)}
              onMouseLeave={() => onHoverDay(undefined)}
            >
              <span className={cn(
                "w-7 h-7 flex items-center justify-center rounded-full font-medium transition-all",
                (start || end) && "bg-[#087f70] text-white shadow-md shadow-[#087f70]/30 font-semibold",
                !start && !end && today && "text-[#087f70] font-bold",
                !start && !end && !today && "text-[#0b100e] hover:bg-[#f5f7f6]",
              )}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Date Range Picker ───────────────────────────────────────────────────────

interface DateRangePickerProps {
  fromDate?: Date;
  toDate?: Date;
  onApply: (from: Date | undefined, to: Date | undefined) => void;
  onClear: () => void;
}

function DateRangePicker({ fromDate, toDate, onApply, onClear }: DateRangePickerProps) {
  const [open, setOpen]           = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(fromDate);
  const [draftTo,   setDraftTo]   = useState<Date | undefined>(toDate);
  const [hoverDate, setHoverDate] = useState<Date | undefined>();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Left calendar shows previous month, right shows current
  const today = new Date();
  const [leftYear,  setLeftYear]  = useState(today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear());
  const [leftMonth, setLeftMonth] = useState(today.getMonth() === 0 ? 11 : today.getMonth() - 1);
  const [rightYear, setRightYear]  = useState(today.getFullYear());
  const [rightMonth,setRightMonth] = useState(today.getMonth());

  // Sync draft range when the picker opens
  const handleToggleOpen = () => {
    if (!open) {
      setDraftFrom(fromDate);
      setDraftTo(toDate);
      setActivePreset(null);
    }
    setOpen(!open);
  };

  const handleDayClick = (d: Date) => {
    setActivePreset(null);
    if (!draftFrom || (draftFrom && draftTo)) {
      // Start fresh
      setDraftFrom(d);
      setDraftTo(undefined);
    } else {
      // Second click
      if (d < draftFrom) {
        setDraftTo(draftFrom);
        setDraftFrom(d);
      } else {
        setDraftTo(d);
      }
    }
  };

  const handlePreset = (preset: typeof PRESETS[0]) => {
    const { from, to } = preset.getRange();
    setDraftFrom(from);
    setDraftTo(to);
    setActivePreset(preset.label);
  };

  const handleApply = () => {
    onApply(draftFrom, draftTo);
    setOpen(false);
  };
  const handleClear = () => {
    setDraftFrom(undefined);
    setDraftTo(undefined);
    setActivePreset(null);
    onClear();
    setOpen(false);
  };

  // Navigation: keep left always one month behind right
  const goPrev = () => {
    const lDate = new Date(leftYear, leftMonth - 1);
    setLeftYear(lDate.getFullYear()); setLeftMonth(lDate.getMonth());
    const rDate = new Date(rightYear, rightMonth - 1);
    setRightYear(rDate.getFullYear()); setRightMonth(rDate.getMonth());
  };
  const goNext = () => {
    const lDate = new Date(leftYear, leftMonth + 1);
    setLeftYear(lDate.getFullYear()); setLeftMonth(lDate.getMonth());
    const rDate = new Date(rightYear, rightMonth + 1);
    setRightYear(rDate.getFullYear()); setRightMonth(rDate.getMonth());
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hasRange = fromDate && toDate;
  const label = hasRange
    ? `${format(fromDate!, "MMM d, yyyy")}  –  ${format(toDate!, "MMM d, yyyy")}`
    : fromDate
    ? format(fromDate, "MMM d, yyyy")
    : "Select date range";

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger */}
      <button
        onClick={handleToggleOpen}
        className={cn(
          "flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-[9px] border text-[13px] font-medium transition-all",
          "bg-white hover:bg-[#f5f7f6]",
          open ? "border-[#087f70] shadow-sm text-[#0b100e]" : "border-black/[0.08] text-[#68726d] hover:text-[#0b100e]",
        )}
      >
        <CalendarIcon className={cn("w-4 h-4 shrink-0", hasRange ? "text-[#087f70]" : "text-[#84908a]")} />
        <span className={cn("whitespace-nowrap hidden sm:inline", hasRange && "text-[#0b100e]")}>{label}</span>
        <div className="flex items-center gap-1 ml-0.5">
          {hasRange && (
            <span
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="w-4 h-4 rounded-full bg-[#f0faf8] flex items-center justify-center hover:bg-[#e7f6f2] transition-colors cursor-pointer"
            >
              <X className="w-2.5 h-2.5 text-[#087f70]" />
            </span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 text-[#84908a] transition-transform duration-200", open && "rotate-180")} />
        </div>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed sm:absolute inset-x-2 top-16 sm:inset-auto sm:top-full sm:right-0 sm:mt-2 z-[100] bg-white rounded-[14px] border border-black/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.12)] overflow-hidden max-h-[85vh] sm:max-h-none sm:max-w-none flex flex-col">
          <div className="flex flex-col sm:flex-row overflow-y-auto min-h-0">

            {/* ── Left sidebar: presets ── */}
            <div className="w-full sm:w-44 bg-[#f9faf9] border-b sm:border-b-0 sm:border-r border-black/[0.06] p-4 flex flex-col gap-1">
              <p className="text-[10px] font-bold text-[#84908a] uppercase tracking-widest mb-2 px-1">Quick Select</p>
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-[8px] text-[13px] font-medium transition-all",
                    activePreset === p.label
                      ? "bg-[#f0faf8] text-[#087f70] font-semibold shadow-sm"
                      : "text-[#68726d] hover:bg-white hover:text-[#0b100e] hover:shadow-sm",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* ── Right: calendars + footer ── */}
            <div className="flex flex-col">
              {/* Draft selection summary */}
              <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-black/[0.06]">
                <div className={cn(
                  "flex-1 rounded-[10px] border px-4 py-2.5 text-[13px] transition-colors",
                  draftFrom ? "border-[#087f70]/30 bg-[#f0faf8]" : "border-black/[0.08] bg-[#f9faf9]",
                )}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#84908a] mb-0.5">From</p>
                  <p className={cn("font-semibold", draftFrom ? "text-[#0b100e]" : "text-[#84908a]")}>
                    {draftFrom ? format(draftFrom, "MMM d, yyyy") : "Start date"}
                  </p>
                </div>
                <div className="text-black/[0.1]">→</div>
                <div className={cn(
                  "flex-1 rounded-[10px] border px-4 py-2.5 text-[13px] transition-colors",
                  draftTo ? "border-[#087f70]/30 bg-[#f0faf8]" : "border-black/[0.08] bg-[#f9faf9]",
                )}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#84908a] mb-0.5">To</p>
                  <p className={cn("font-semibold", draftTo ? "text-[#0b100e]" : "text-[#84908a]")}>
                    {draftTo ? format(draftTo, "MMM d, yyyy") : "End date"}
                  </p>
                </div>
              </div>

              {/* Dual calendars */}
              <div className="flex flex-col sm:flex-row gap-6 px-4 sm:px-6 py-5 overflow-x-auto">
                <MiniCal
                  year={leftYear} month={leftMonth}
                  selectedFrom={draftFrom} selectedTo={draftTo} hoverDate={hoverDate}
                  onSelectDay={handleDayClick} onHoverDay={setHoverDate}
                  onPrev={goPrev}
                />
                <div className="hidden sm:block w-px bg-black/[0.06] self-stretch" />
                <MiniCal
                  year={rightYear} month={rightMonth}
                  selectedFrom={draftFrom} selectedTo={draftTo} hoverDate={hoverDate}
                  onSelectDay={handleDayClick} onHoverDay={setHoverDate}
                  onNext={goNext}
                />
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between px-6 pb-5 pt-1 border-t border-black/[0.06] gap-3">
                <button
                  onClick={handleClear}
                  className="h-9 px-5 rounded-[8px] border border-black/[0.08] text-[13px] font-medium text-[#68726d] hover:bg-[#f5f7f6] hover:text-[#0b100e] transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  disabled={!draftFrom}
                  className="h-9 px-7 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function getCurrentSectionLabel(pathname: string, tab?: string | null): string {
  if (pathname === "/expenses/reimbursements") return "Reimbursements";
  if (pathname.match(/^\/expenses\/reimbursements\/[^/]+$/)) return "Reimbursement Details";
  if (pathname.startsWith("/settings/personal-settings") && tab === "company-profile") {
    return "Company Settings";
  }

  // Procurement sub-routes
  if (pathname === "/procurement/purchase-request/new") return "New Purchase Request";
  if (pathname.match(/^\/procurement\/purchase-request\/[^/]+$/)) return "Purchase Request Details";
  if (pathname.startsWith("/procurement/purchase-request")) return "Purchase Requests";
  if (pathname.match(/^\/procurement\/purchase-order\/[^/]+\/edit$/)) return "Edit Purchase Order";
  if (pathname.match(/^\/procurement\/purchase-order\/[^/]+$/)) return "Purchase Order Details";
  if (pathname === "/procurement/purchase-order/new") return "New Purchase Order";
  if (pathname.startsWith("/procurement/purchase-order")) return "Purchase Orders";
  if (pathname.match(/^\/procurement\/confirmation\/[^/]+$/)) return "Confirmation Details";
  if (pathname.startsWith("/procurement/confirmation")) return "Confirmation";
  if (pathname.startsWith("/procurement/categories")) return "Categories";
  if (pathname.startsWith("/procurement")) return "Procurement";

  const exactMatch = navigationItems.find((item) => {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    return item.href === pathname;
  });
  if (exactMatch) return exactMatch.label;

  const settingsItem = navigationItems.find((item) => item.href === "/settings/data-integration");
  if (settingsItem?.subItems && pathname.startsWith("/settings/")) {
    const sub = settingsItem.subItems.find((s) => pathname.startsWith(s.href));
    if (sub) return sub.label;
    if (pathname.startsWith("/settings")) return settingsItem.label;
  }

  const prefixMatch = navigationItems
    .filter((item) => item.href !== "/dashboard")
    .find((item) => pathname.startsWith(item.href));
  if (prefixMatch) return prefixMatch.label;

  return "Overview";
}

// ─── UserSection ─────────────────────────────────────────────────────────────

export function UserSection() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router   = useRouter();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = useNotificationCount();
  const user = useAuthStore((state) => state.user);

  const { fromDate, toDate, setFromDate, setToDate, resetDates } = useDateFilterStore();
  const { action: headerAction, clearAction } = useHeaderActionStore();
  const customBackHandler = useHeaderBackStore((s) => s.handler);
  const clearBackHandler = useHeaderBackStore((s) => s.clearBackHandler);

  useEffect(() => {
    const isProcurementListPage =
      pathname === "/procurement/purchase-request" ||
      pathname === "/procurement/purchase-order" ||
      pathname === "/procurement/confirmation";
    const isExpensesListPageNow = pathname === "/expenses";
    if (!isExpensesListPageNow && !isProcurementListPage) resetDates();
    clearAction();
    // Any registered in-page back handler belongs to the page we're leaving.
    clearBackHandler();
  }, [pathname, resetDates, clearAction, clearBackHandler]);

  const can = useAuthStore((state) => state.can);
  const authReady = useAuthStore((state) => !state.isLoading);
  const hasTeamScope    = authReady && can("expense.report", "read_department");
  const hasCompanyScope = authReady && can("expense.report", "read_company");
  const isPersonalOnly  = authReady && !hasTeamScope && !hasCompanyScope;

  const currentSectionLabel = useMemo(() => {
    const tab = searchParams.get("tab");
    const base = getCurrentSectionLabel(pathname, tab);
    // For own-scope-only users on the expenses page, surface "My Expenses"
    if (isPersonalOnly && pathname === "/expenses") return "My Expenses";
    return base;
  }, [pathname, searchParams, isPersonalOnly]);

  // All page-detection flags in one memoized block — runs once per pathname change
  const {
    isAuditTrailPage,
    isSplitExpensePage,
    isPersonalExpenseDetailPage,
    isPersonalExpenseEditPage,
    isPersonalExpenseDeletePage,
    isCompanyExpenseDetailPage,
    isBatchExpensePage,
    isReimbursementDetailPage,
    expenseIdFromPath,
    isExpensesListPage,
    isProcurementListPage,
    isUploadReceiptPage,
    isNewExpensePage,
    isNewReportPage,
    isViewRolePage,
    isVendorBulkInvitePage,
    isNewPurchaseRequestPage,
    isNewPurchaseOrderPage,
    isPurchaseRequestDetailPage,
    isPOEditPage,
    isPODetailPage,
    isConfirmationDetailPage,
    isVendorDetailPage,
    isBackButtonPage,
  } = useMemo(() => {
    const expDetailMatch      = /^\/expenses\/\d+$/.test(pathname);
    const auditTrailMatch     = /^\/expenses\/\d+\/audit-trail$/.test(pathname);
    const splitMatch          = /^\/expenses\/\d+\/split-expense$/.test(pathname);
    const personalDetailMatch = /^\/expenses\/personal\/[a-f0-9-]+$/i.test(pathname);
    const personalEditMatch   = /^\/expenses\/personal\/[a-f0-9-]+\/edit$/i.test(pathname);
    const personalDeleteMatch = /^\/expenses\/personal\/[a-f0-9-]+\/delete$/i.test(pathname);
    const companyDetailMatch  = /^\/expenses\/company\/[a-f0-9-]+$/i.test(pathname);
    const batchMatch          = /^\/expenses\/batch\/[^/]+$/.test(pathname);
    const reimbDetailMatch    = /^\/expenses\/reimbursements\/[^/]+$/.test(pathname);
    const expIdMatch          = pathname.match(/\/expenses\/(\d+)/)?.[1];
    const expListPage         = pathname === "/expenses" || pathname === "/expenses/reimbursements";
    const procListPage        = pathname === "/procurement/purchase-request" ||
                                pathname === "/procurement/purchase-order" ||
                                pathname === "/procurement/confirmation";
    const uploadPage          = pathname === "/expenses/new-expense/upload";
    const newExpPage          = pathname === "/expenses/new-expense";
    const newReportPage       = pathname === "/expenses/new-report";
    const viewRolePage        = pathname.startsWith("/people/view-role/");
    const vendorBulkPage      = pathname === "/vendors/bulk-invite-page";
    const newPRPage           = pathname === "/procurement/purchase-request/new";
    const newPOPage           = pathname === "/procurement/purchase-order/new";
    const prDetailMatch       = /^\/procurement\/purchase-request\/[^/]+$/.test(pathname) && !newPRPage;
    const poEditMatch         = /^\/procurement\/purchase-order\/[^/]+\/edit$/.test(pathname);
    const poDetailMatch       = /^\/procurement\/purchase-order\/[^/]+$/.test(pathname) && !newPOPage;
    const confirmDetailMatch  = /^\/procurement\/confirmation\/[^/]+$/.test(pathname);
    const vendorDetailMatch   = /^\/vendors\/[^/]+$/.test(pathname) && !vendorBulkPage;

    const backButtonPage =
      expDetailMatch || auditTrailMatch || splitMatch ||
      personalDeleteMatch || personalDetailMatch || personalEditMatch ||
      companyDetailMatch || uploadPage || newExpPage || newReportPage ||
      batchMatch || reimbDetailMatch || viewRolePage || vendorBulkPage || vendorDetailMatch ||
      newPRPage || newPOPage || prDetailMatch || poEditMatch || poDetailMatch || confirmDetailMatch ||
      pathname === "/people/invite/leadership" ||
      pathname === "/people/invite/employees" ||
      pathname === "/people/create-role";

    return {
      isAuditTrailPage:            auditTrailMatch,
      isSplitExpensePage:          splitMatch,
      isPersonalExpenseDetailPage: personalDetailMatch,
      isPersonalExpenseEditPage:   personalEditMatch,
      isPersonalExpenseDeletePage: personalDeleteMatch,
      isCompanyExpenseDetailPage:  companyDetailMatch,
      isBatchExpensePage:          batchMatch,
      isReimbursementDetailPage:   reimbDetailMatch,
      expenseIdFromPath:           expIdMatch,
      isExpensesListPage:          expListPage,
      isProcurementListPage:       procListPage,
      isUploadReceiptPage:         uploadPage,
      isNewExpensePage:            newExpPage,
      isNewReportPage:             newReportPage,
      isViewRolePage:              viewRolePage,
      isVendorBulkInvitePage:      vendorBulkPage,
      isNewPurchaseRequestPage:    newPRPage,
      isNewPurchaseOrderPage:      newPOPage,
      isPurchaseRequestDetailPage: prDetailMatch,
      isPOEditPage:                poEditMatch,
      isPODetailPage:              poDetailMatch,
      isConfirmationDetailPage:    confirmDetailMatch,
      isVendorDetailPage:          vendorDetailMatch,
      isBackButtonPage:            backButtonPage,
    };
  }, [pathname]);

  const handleBack = () => {
    if (isUploadReceiptPage) {
      const p = new URLSearchParams(window.location.search);
      const n = p.get("name") || "", d = p.get("date") || "";
      if (n && d) { sessionStorage.setItem("pendingReportName", n); sessionStorage.setItem("pendingReportDate", d); }
      router.push("/expenses?tab=personal-expenses&openAddReport=true");
      return;
    }
    if (isNewExpensePage) {
      const p = new URLSearchParams(window.location.search);
      const params = new URLSearchParams();
      if (p.get("name")) params.set("name", p.get("name")!);
      if (p.get("date")) params.set("date", p.get("date")!);
      router.push(`/expenses/new-expense/upload?${params.toString()}`);
      return;
    }
    if (isPersonalExpenseDetailPage || isPersonalExpenseEditPage || isPersonalExpenseDeletePage) {
      router.push(`/expenses?tab=${sessionStorage.getItem("expensesReturnTab") || "personal-expenses"}&page=${sessionStorage.getItem("expensesReturnPage") || "1"}`);
      return;
    }
    if (isCompanyExpenseDetailPage) {
      const returnTab = sessionStorage.getItem("expensesReturnTab") ||
        (hasCompanyScope ? "company-expenses" : hasTeamScope ? "team-expenses" : "personal-expenses");
      router.push(`/expenses?tab=${returnTab}`);
      return;
    }
    if (isReimbursementDetailPage) { router.push("/expenses/reimbursements"); return; }
    if (isBatchExpensePage) {
      const defaultTab = hasCompanyScope ? "company-expenses" : hasTeamScope ? "team-expenses" : "personal-expenses";
      const tab = sessionStorage.getItem("expensesTab") || defaultTab;
      const filters = sessionStorage.getItem("expensesFilters");
      const params = new URLSearchParams(); params.set("tab", tab);
      if (filters) { try { const f = JSON.parse(filters); Object.entries(f).forEach(([k,v]) => { if(v) params.set(k,String(v)); }); } catch {} }
      router.push(`/expenses?${params.toString()}`);
      return;
    }
    if (isAuditTrailPage || isSplitExpensePage) {
      if (sessionStorage.getItem("expensePreviousPage") === "batch" && expenseIdFromPath) {
        const slug = sessionStorage.getItem("batchEmployeeSlug");
        if (slug) { router.push(`/expenses/batch/${slug}`); return; }
      }
      router.push(expenseIdFromPath ? `/expenses/${expenseIdFromPath}` : "/expenses");
      return;
    }
    if (isNewReportPage) {
      router.push(`/expenses?tab=${sessionStorage.getItem("expensesReturnTab") || "personal-expenses"}&page=${sessionStorage.getItem("expensesReturnPage") || "1"}`);
      return;
    }
    if (pathname === "/people/invite/leadership") { router.push("/people"); return; }
    if (pathname === "/people/create-role" || isViewRolePage) { router.push("/people?tab=roles"); return; }
    if (pathname === "/people/invite/employees") {
      const step = new URLSearchParams(window.location.search).get("step");
      if (step === "preview") router.push("/people/invite/employees?step=upload");
      else if (step === "upload") {
        const ref = sessionStorage.getItem("uploadDirReferrer");
        sessionStorage.removeItem("uploadDirReferrer");
        router.push(ref === "directory" ? "/people?tab=directory" : "/people");
      } else if (step === "directory") router.push("/people?tab=directory");
      else router.push("/people");
      return;
    }
    if (isVendorBulkInvitePage || isVendorDetailPage) { router.push("/vendors"); return; }
    if (isNewPurchaseRequestPage || isPurchaseRequestDetailPage) { 
      const scope = searchParams.get("scope");
      const outerTab = searchParams.get("outerTab") || scope;
      const innerTab = searchParams.get("innerTab");
      
      const params = new URLSearchParams();
      if (outerTab) params.set("outerTab", outerTab);
      if (innerTab) params.set("innerTab", innerTab);
      
      const query = params.toString();
      router.push(query ? `/procurement/purchase-request?${query}` : "/procurement/purchase-request"); 
      return; 
    }
    if (isNewPurchaseOrderPage) {
      const outerTab = searchParams.get("outerTab");
      const innerTab = searchParams.get("innerTab");
      const params = new URLSearchParams();
      if (outerTab) params.set("outerTab", outerTab);
      if (innerTab) params.set("innerTab", innerTab);
      const query = params.toString();
      router.push(query ? `/procurement/purchase-order?${query}` : "/procurement/purchase-order");
      return;
    }
    if (isPOEditPage || isPODetailPage) {
      const outerTab = searchParams.get("outerTab");
      const innerTab = searchParams.get("innerTab");
      const params = new URLSearchParams();
      if (outerTab) params.set("outerTab", outerTab);
      if (innerTab) params.set("innerTab", innerTab);
      const query = params.toString();

      if (isPOEditPage) {
        const detailPath = pathname.replace(/\/edit$/, "");
        router.push(query ? `${detailPath}?${query}` : detailPath);
        return;
      }

      router.push(query ? `/procurement/purchase-order?${query}` : "/procurement/purchase-order");
      return;
    }
    if (isConfirmationDetailPage) { router.push("/procurement/confirmation"); return; }
    router.push("/expenses");
  };

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 w-full">
      {/* ── Left ── */}
      <div className="flex min-w-0 items-center gap-3">
        {customBackHandler || isBackButtonPage ? (
          <Button
            variant="ghost"
            className="flex h-9! items-center gap-2 rounded-[9px] border border-black/[0.07] bg-white px-3! text-[13px] font-semibold text-[#52605b] shadow-sm hover:bg-[#f4f8f6] hover:text-[#087f70] has-[>svg]:px-3!"
            onClick={() => {
              // A page-registered handler always knows its own exact "one
              // level back" (e.g. the previous step of a wizard) better than
              // the generic pathname-based logic below, so it takes priority.
              if (customBackHandler) {
                customBackHandler();
                return;
              }
              handleBack();
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
        ) : (
          <div className="min-w-0">
            <h1 className="truncate text-[16px] font-semibold tracking-[-0.02em] text-[#10231d] sm:text-[18px]">
              {currentSectionLabel}
            </h1>
          </div>
        )}
        {/* For personal-only users on /expenses, mount the CTA here so it
            registers into the header action store (no inline heading needed) */}
        {isPersonalOnly && pathname === "/expenses" && !isBackButtonPage && !customBackHandler && (
          <NewExpenseHeaderAction />
        )}
      </div>

      {/* ── Right ── */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* Date range picker — expenses list & procurement list pages */}
        {(isExpensesListPage || isProcurementListPage) && (
          <DateRangePicker
            fromDate={fromDate ?? undefined}
            toDate={toDate ?? undefined}
            onApply={(from, to) => { setFromDate(from); setToDate(to); }}
            onClear={() => { setFromDate(undefined); setToDate(undefined); }}
          />
        )}

        {/* Bot - hidden on very small screens */}
        <Button variant="ghost" size="icon" className="relative hidden h-9 w-9 rounded-[9px] border border-transparent text-[#68726d] hover:border-black/[0.05] hover:bg-[#f4f8f6] hover:text-[#0b100e] xs:flex">
          <Bot className="h-[18px] w-[18px]" />
          <div className="absolute top-[7px] right-[7px] w-2 h-2 bg-[#0ea894] rounded-full animate-pulse border-2 border-white" />
        </Button>

        {/* Bell */}
        <Popover open={isNotifOpen} onOpenChange={setIsNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-[9px] border border-transparent text-[#68726d] outline-none hover:border-black/[0.05] hover:bg-[#f4f8f6] hover:text-[#0b100e]">
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none shadow-sm border border-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-[420px] p-0 rounded-xl overflow-hidden shadow-2xl border-black/[0.08]">
            <Notification onClose={() => setIsNotifOpen(false)} />
          </PopoverContent>
        </Popover>

        {/* Dynamic CTA button registered by the current page */}
        {headerAction && (
          <div className="flex items-center gap-2">
            {/* Optional Secondary Action */}
            {headerAction.secondaryAction && (
              headerAction.secondaryAction.items ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-tour={headerAction.secondaryAction.dataTourId}
                      className="h-9 px-4 rounded-[8px] border border-[#087f70] text-[#087f70] bg-transparent hover:bg-[#f0faf8] text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap">
                      {headerAction.secondaryAction.iconName === "upload" ? (
                        <HugeiconsIcon icon={Upload04Icon} className="w-4 h-4" />
                      ) : (
                        <PlusCircle className="w-4 h-4" strokeWidth={2} />
                      )}
                      {headerAction.secondaryAction.label}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-[12px] border-black/[0.08] p-1 shadow-lg">
                    {headerAction.secondaryAction.items.map((item, i) => (
                      <DropdownMenuItem key={i} className="cursor-pointer py-2 px-3 text-[13px] rounded-[6px] flex items-center gap-2.5 focus:bg-[#f5f7f6] focus:text-[#0b100e]" onClick={item.onClick}>
                        <PlusCircle className="h-4 w-4 text-[#087f70] shrink-0" />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  onClick={headerAction.secondaryAction.onClick}
                  data-tour={headerAction.secondaryAction.dataTourId}
                  className="h-9 px-4 rounded-[8px] border border-[#087f70] text-[#087f70] bg-transparent hover:bg-[#f0faf8] text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {headerAction.secondaryAction.iconName === "upload" ? (
                    <HugeiconsIcon icon={Upload04Icon} className="w-4 h-4" />
                  ) : (
                    <PlusCircle className="w-4 h-4" strokeWidth={2} />
                  )}
                  {headerAction.secondaryAction.label}
                </button>
              )
            )}

            {/* Primary Action */}
            {headerAction.items ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    data-tour={headerAction.dataTourId}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("villeto:invite-button-clicked"));
                    }}
                    className="h-9 px-4 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold flex items-center gap-2 hover:bg-[#076b5e] transition-colors cursor-pointer whitespace-nowrap">
                    {headerAction.iconName === "upload" ? (
                      <HugeiconsIcon icon={Upload04Icon} className="w-4 h-4" />
                    ) : (
                      <PlusCircle className="w-4 h-4" strokeWidth={2} />
                    )}
                    {headerAction.label}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-[12px] border-black/[0.08] p-1 shadow-lg" data-tour="invite-dropdown-menu">
                  {headerAction.items.map((item, i) => {
                    const menuItem = (
                      <DropdownMenuItem 
                        key={i} 
                        className={`cursor-pointer py-2 px-3 text-[13px] rounded-[6px] flex items-center gap-2.5 focus:bg-[#f5f7f6] focus:text-[#0b100e] ${item.disabled ? 'opacity-50' : ''}`} 
                        onClick={item.disabled ? (e) => e.preventDefault() : item.onClick}
                        disabled={item.disabled}
                      >
                        <PlusCircle className="h-4 w-4 text-[#087f70] shrink-0" />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    );

                    if (item.tooltip) {
                      return (
                        <TooltipProvider key={i}>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div className="w-full">
                                {menuItem}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" align="center" className="max-w-[280px]">
                              <p className="text-sm font-medium">{item.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }

                    return menuItem;
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              (() => {
                const mainBtn = (
                  <button
                    onClick={headerAction.disabled ? undefined : headerAction.onClick}
                    disabled={headerAction.disabled}
                    data-tour={headerAction.dataTourId}
                    className={`h-9 px-4 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${headerAction.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#076b5e] cursor-pointer'}`}
                  >
                    {headerAction.iconName === "upload" ? (
                      <HugeiconsIcon icon={Upload04Icon} className="w-4 h-4" />
                    ) : (
                      <PlusCircle className="w-4 h-4" strokeWidth={2} />
                    )}
                    {headerAction.label}
                  </button>
                );

                if (headerAction.tooltip) {
                  return (
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="inline-block">
                            {mainBtn}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end" className="max-w-[280px]">
                          <p className="text-sm font-medium">{headerAction.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return mainBtn;
              })()
            )}
          </div>
        )}

        <div className="mx-0.5 hidden h-7 w-px bg-black/[0.07] sm:block" />
        <button
          type="button"
          onClick={() => router.push("/settings/personal-settings?tab=my-profile")}
          className="group flex h-10 items-center gap-2 rounded-[10px] border border-black/[0.06] bg-white p-1 pr-1 shadow-[0_1px_2px_rgba(16,35,29,0.04)] transition-colors hover:bg-[#f4f8f6] xl:pr-2.5"
          aria-label="Open personal settings"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e6f7f3] text-[11px] font-bold uppercase text-[#087f70] ring-1 ring-[#087f70]/10">
            {user?.firstName?.[0] || user?.email?.[0] || "U"}
          </span>
          <span className="hidden max-w-28 text-left xl:block">
            <span className="block truncate text-[11px] font-semibold leading-4 text-[#10231d]">
              {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "My profile"}
            </span>
            <span className="block truncate text-[9px] leading-3 text-[#7a8782]">
              {user?.companyRole?.name || user?.jobTitle || "Workspace member"}
            </span>
          </span>
          <ChevronDown className="hidden size-3.5 text-[#8a9691] transition-transform group-hover:translate-y-0.5 xl:block" />
        </button>
      </div>

      {/* Notifications previously here, now moved to Bell Popover */}
    </div>
  );
}
