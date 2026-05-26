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
                inRange && "bg-primary/10",
                // Start cap
                start && "bg-primary/10 rounded-l-full",
                // End cap
                end   && "bg-primary/10 rounded-r-full",
                // Single selection (same day)
                start && end && "rounded-full",
              )}
              onClick={() => onSelectDay(d)}
              onMouseEnter={() => onHoverDay(d)}
              onMouseLeave={() => onHoverDay(undefined)}
            >
              <span className={cn(
                "w-7 h-7 flex items-center justify-center rounded-full font-medium transition-all",
                (start || end) && "bg-primary text-primary-foreground shadow-md shadow-primary/30 font-semibold",
                !start && !end && today && "text-primary font-bold",
                !start && !end && !today && "text-foreground hover:bg-muted",
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

  // Sync with store when opened
  useEffect(() => {
    if (open) {
      setDraftFrom(fromDate);
      setDraftTo(toDate);
      setActivePreset(null);
    }
  }, [open]);

  // Clicking phase: first click = from, second click = to
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
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-2 h-9 pl-3.5 pr-3 rounded-xl border text-sm font-medium transition-all",
          "bg-white hover:bg-muted/30",
          open ? "border-primary/50 shadow-sm shadow-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-border/80",
        )}
      >
        <CalendarIcon className={cn("w-4 h-4 shrink-0", hasRange ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("whitespace-nowrap", hasRange && "text-foreground")}>{label}</span>
        <div className="flex items-center gap-1 ml-1">
          {hasRange && (
            <span
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="w-4 h-4 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors cursor-pointer"
            >
              <X className="w-2.5 h-2.5 text-muted-foreground" />
            </span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
        </div>
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-2xl border border-border shadow-[0_8px_40px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="flex">

            {/* ── Left sidebar: presets ── */}
            <div className="w-44 bg-muted/30 border-r border-border/60 p-4 flex flex-col gap-1">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Quick Select</p>
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    activePreset === p.label
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/80 hover:bg-white hover:text-foreground hover:shadow-sm",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* ── Right: calendars + footer ── */}
            <div className="flex flex-col">
              {/* Draft selection summary */}
              <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border/50">
                <div className={cn(
                  "flex-1 rounded-xl border px-4 py-2.5 text-sm transition-colors",
                  draftFrom ? "border-primary/30 bg-primary/[0.03]" : "border-border bg-muted/30",
                )}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">From</p>
                  <p className={cn("font-semibold", draftFrom ? "text-foreground" : "text-muted-foreground/60")}>
                    {draftFrom ? format(draftFrom, "MMM d, yyyy") : "Start date"}
                  </p>
                </div>
                <div className="text-muted-foreground/40">→</div>
                <div className={cn(
                  "flex-1 rounded-xl border px-4 py-2.5 text-sm transition-colors",
                  draftTo ? "border-primary/30 bg-primary/[0.03]" : "border-border bg-muted/30",
                )}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">To</p>
                  <p className={cn("font-semibold", draftTo ? "text-foreground" : "text-muted-foreground/60")}>
                    {draftTo ? format(draftTo, "MMM d, yyyy") : "End date"}
                  </p>
                </div>
              </div>

              {/* Dual calendars */}
              <div className="flex gap-6 px-6 py-5">
                <MiniCal
                  year={leftYear} month={leftMonth}
                  selectedFrom={draftFrom} selectedTo={draftTo} hoverDate={hoverDate}
                  onSelectDay={handleDayClick} onHoverDay={setHoverDate}
                  onPrev={goPrev}
                />
                <div className="w-px bg-border/50 self-stretch" />
                <MiniCal
                  year={rightYear} month={rightMonth}
                  selectedFrom={draftFrom} selectedTo={draftTo} hoverDate={hoverDate}
                  onSelectDay={handleDayClick} onHoverDay={setHoverDate}
                  onNext={goNext}
                />
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between px-6 pb-5 pt-1 border-t border-border/50 gap-3">
                <button
                  onClick={handleClear}
                  className="h-9 px-5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  disabled={!draftFrom}
                  className="h-9 px-7 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
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
  if (pathname.startsWith("/settings/personal-settings") && tab === "company-profile") {
    return "Company Settings";
  }

  // Procurement sub-routes
  if (pathname === "/procurement/purchase-request/new") return "New Purchase Request";
  if (pathname.match(/^\/procurement\/purchase-request\/[^/]+$/)) return "Purchase Request Details";
  if (pathname.startsWith("/procurement/purchase-request")) return "Purchase Requests";
  if (pathname.match(/^\/procurement\/purchase-order\/[^/]+$/)) return "Purchase Order Details";
  if (pathname.startsWith("/procurement/purchase-order")) return "Purchase Orders";
  if (pathname.match(/^\/procurement\/confirmation\/[^/]+$/)) return "Confirmation Details";
  if (pathname.startsWith("/procurement/confirmation")) return "Confirmation";
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

  const { fromDate, toDate, setFromDate, setToDate, resetDates } = useDateFilterStore();
  const { action: headerAction, clearAction } = useHeaderActionStore();

  useEffect(() => {
    const isProcurementListPage =
      pathname === "/procurement/purchase-request" ||
      pathname === "/procurement/purchase-order" ||
      pathname === "/procurement/confirmation";
    const isExpensesListPageNow = pathname === "/expenses";
    if (!isExpensesListPageNow && !isProcurementListPage) resetDates();
    clearAction();
  }, [pathname, resetDates, clearAction]);

  const currentSectionLabel = useMemo(() => {
    const tab = searchParams.get("tab");
    return getCurrentSectionLabel(pathname, tab);
  }, [pathname, searchParams]);

  // Page detection
  const isExpenseDetailPage         = pathname.match(/^\/expenses\/\d+$/);
  const isAuditTrailPage            = pathname.match(/^\/expenses\/\d+\/audit-trail$/);
  const isSplitExpensePage          = pathname.match(/^\/expenses\/\d+\/split-expense$/);
  const isPersonalExpenseDetailPage = pathname.match(/^\/expenses\/personal\/[a-f0-9\-]+$/i);
  const isPersonalExpenseEditPage   = pathname.match(/^\/expenses\/personal\/[a-f0-9\-]+\/edit$/i);
  const isPersonalExpenseDeletePage = pathname.match(/^\/expenses\/personal\/[a-f0-9\-]+\/delete$/i);
  const isCompanyExpenseDetailPage  = pathname.match(/^\/expenses\/company\/[a-f0-9\-]+$/i);
  const isBatchExpensePage          = pathname.match(/^\/expenses\/batch\/[^/]+$/);
  const expenseIdFromPath           = pathname.match(/\/expenses\/(\d+)/)?.[1];
  const isExpensesListPage          = pathname === "/expenses";
  const isProcurementListPage       = pathname === "/procurement/purchase-request" ||
                                      pathname === "/procurement/purchase-order" ||
                                      pathname === "/procurement/confirmation";
  const isUploadReceiptPage         = pathname === "/expenses/new-expense/upload";
  const isNewExpensePage            = pathname === "/expenses/new-expense";
  const isNewReportPage             = pathname === "/expenses/new-report";
  const isViewRolePage              = pathname.startsWith("/people/view-role/");
  const isVendorBulkInvitePage      = pathname === "/vendors/bulk-invite-page";
  const isNewPurchaseRequestPage    = pathname === "/procurement/purchase-request/new";
  const isPurchaseRequestDetailPage = pathname.match(/^\/procurement\/purchase-request\/[^/]+$/) && pathname !== "/procurement/purchase-request/new";
  const isPODetailPage              = pathname.match(/^\/procurement\/purchase-order\/[^/]+$/);
  const isConfirmationDetailPage    = pathname.match(/^\/procurement\/confirmation\/[^/]+$/);
  const isVendorDetailPage          = pathname.match(/^\/vendors\/[^/]+$/) && pathname !== "/vendors/bulk-invite-page";

  const isBackButtonPage =
    isExpenseDetailPage || isAuditTrailPage || isSplitExpensePage ||
    isPersonalExpenseDeletePage || isPersonalExpenseDetailPage || isPersonalExpenseEditPage ||
    isCompanyExpenseDetailPage || isUploadReceiptPage || isNewExpensePage || isNewReportPage ||
    isBatchExpensePage || isViewRolePage || isVendorBulkInvitePage || !!isVendorDetailPage ||
    isNewPurchaseRequestPage || !!isPurchaseRequestDetailPage ||
    !!isPODetailPage || !!isConfirmationDetailPage ||
    pathname === "/people/invite/leadership" ||
    pathname === "/people/invite/employees" ||
    pathname === "/people/create-role";

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
    if (isCompanyExpenseDetailPage) { router.push("/expenses?tab=company-expenses"); return; }
    if (isBatchExpensePage) {
      const tab = sessionStorage.getItem("expensesTab") || "company-expenses";
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
    if (isNewPurchaseRequestPage || isPurchaseRequestDetailPage) { router.push("/procurement/purchase-request"); return; }
    if (isPODetailPage) { router.push("/procurement/purchase-order"); return; }
    if (isConfirmationDetailPage) { router.push("/procurement/confirmation"); return; }
    router.push("/expenses");
  };

  return (
    <div className="flex items-center justify-between w-full">
      {/* ── Left ── */}
      <div className="flex items-center gap-3">
        {isBackButtonPage ? (
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-0 text-xl hover:bg-transparent hover:text-primary h-auto! py-1! has-[>svg]:px-0!"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-base">Back</span>
          </Button>
        ) : (
          <h1 className="text-2xl font-bold">{currentSectionLabel}</h1>
        )}
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-4">
        {/* Date range picker — expenses list & procurement list pages */}
        {(isExpensesListPage || isProcurementListPage) && (
          <DateRangePicker
            fromDate={fromDate ?? undefined}
            toDate={toDate ?? undefined}
            onApply={(from, to) => { setFromDate(from); setToDate(to); }}
            onClear={() => { setFromDate(undefined); setToDate(undefined); }}
          />
        )}

        {/* Bot */}
        <Button variant="ghost" size="icon" className="relative h-4 w-4">
          <Bot className="h-5 w-5" />
          <div className="absolute -top-1 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </Button>

        {/* Bell */}
        <Popover open={isNotifOpen} onOpenChange={setIsNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative w-4 h-4 outline-none">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-bold leading-none shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-[420px] p-0 rounded-xl overflow-hidden shadow-2xl border-border">
            <Notification onClose={() => setIsNotifOpen(false)} />
          </PopoverContent>
        </Popover>

        {/* Dynamic CTA button registered by the current page */}
        {headerAction && (
          <div className="flex items-center gap-3">
            {/* Optional Secondary Action */}
            {headerAction.secondaryAction && (
              headerAction.secondaryAction.items ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-tour={headerAction.secondaryAction.dataTourId}
                      className="h-10 px-5 rounded-full border border-primary text-primary bg-transparent hover:bg-primary/5 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap">
                      {headerAction.secondaryAction.iconName === "upload" ? (
                        <HugeiconsIcon icon={Upload04Icon} className="w-4 h-4" />
                      ) : (
                        <PlusCircle className="w-4 h-4" strokeWidth={2} />
                      )}
                      {headerAction.secondaryAction.label}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    {headerAction.secondaryAction.items.map((item, i) => (
                      <DropdownMenuItem key={i} className="cursor-pointer py-2.5 flex items-center gap-2" onClick={item.onClick}>
                        <PlusCircle className="h-4 w-4 text-primary shrink-0" />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  onClick={headerAction.secondaryAction.onClick}
                  data-tour={headerAction.secondaryAction.dataTourId}
                  className="h-10 px-5 rounded-full border border-primary text-primary bg-transparent hover:bg-primary/5 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
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
                      // Notify setup guide that invite button was clicked
                      // so it can dismiss overlay and show dropdown arrow
                      window.dispatchEvent(new CustomEvent("villeto:invite-button-clicked"));
                    }}
                    className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap">
                    {headerAction.iconName === "upload" ? (
                      <HugeiconsIcon icon={Upload04Icon} className="w-4 h-4" />
                    ) : (
                      <PlusCircle className="w-4 h-4" strokeWidth={2} />
                    )}
                    {headerAction.label}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60" data-tour="invite-dropdown-menu">
                  {headerAction.items.map((item, i) => (
                    <DropdownMenuItem key={i} className="cursor-pointer py-2.5 flex items-center gap-2" onClick={item.onClick}>
                      <PlusCircle className="h-4 w-4 text-primary shrink-0" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={headerAction.onClick}
                data-tour={headerAction.dataTourId}
                className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
              >
                {headerAction.iconName === "upload" ? (
                  <HugeiconsIcon icon={Upload04Icon} className="w-4 h-4" />
                ) : (
                  <PlusCircle className="w-4 h-4" strokeWidth={2} />
                )}
                {headerAction.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notifications previously here, now moved to Bell Popover */}
    </div>
  );
}