"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  Eye,
  Download,
  CreditCard,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import { useTransactionLegalEntities } from "@/features/entity-workspace/hooks";
import { useGetBillPayInvoices, type BillPayInvoice } from "@/queries/bill-pay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

// ── Source definitions ────────────────────────────────────────────────────────
// These map the backend `source` enum values to display labels.
const BILL_SOURCES = [
  { value: "vendor_portal", label: "Vendor Portal" },
  { value: "email",         label: "Email" },
  { value: "manual",        label: "Manual" },
  { value: "api",           label: "API" },
  { value: "ocr",           label: "OCR / Scan" },
  { value: "import",        label: "Import" },
] as const;

type SourceValue = (typeof BILL_SOURCES)[number]["value"];

function getSourceLabel(raw?: string): string {
  if (!raw) return "Manual";
  const found = BILL_SOURCES.find(
    (s) => s.value === raw.toLowerCase() || raw.toLowerCase().includes(s.value)
  );
  return found?.label ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number | string, currency: string = "NGN") {
  const numeric = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(numeric);
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  switch (status?.toLowerCase()) {
    case "awaiting_approval":
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#fff8eb] text-[#d97706] whitespace-nowrap">
          Awaiting Approval
        </span>
      );
    case "ready_for_payment":
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#eff6ff] text-[#3b82f6] whitespace-nowrap">
          Ready for Payment
        </span>
      );
    case "paid":
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#ecfdf5] text-[#10b981] whitespace-nowrap">
          Paid
        </span>
      );
    case "draft":
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#f3f4f6] text-[#6b7280] whitespace-nowrap">
          Draft
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#f3f4f6] text-gray-700 capitalize whitespace-nowrap">
          {(status ?? "").replace(/_/g, " ")}
        </span>
      );
  }
}

// ── Source filter pill/dropdown ───────────────────────────────────────────────
function SourceFilterDropdown({
  value,
  onChange,
}: {
  value: SourceValue | "";
  onChange: (v: SourceValue | "") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeLabel = BILL_SOURCES.find((s) => s.value === value)?.label;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shrink-0 bg-white ${
          value
            ? "border-[#0da594] text-[#0da594]"
            : "border-gray-200 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {value ? (
          <>
            Source: {activeLabel}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.stopPropagation(); onChange(""); setOpen(false); }
              }}
              className="ml-1 hover:text-red-500"
            >
              <X className="w-3 h-3" />
            </span>
          </>
        ) : (
          <>
            Source
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-30 bg-white border border-black/[0.08] rounded-xl shadow-lg min-w-[170px] py-1 overflow-hidden">
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full text-left px-4 py-2 text-xs transition-colors ${
              !value ? "font-semibold text-[#0da594] bg-[#f0faf9]" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            All sources
          </button>
          {BILL_SOURCES.map((src) => (
            <button
              key={src.value}
              onClick={() => { onChange(src.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                value === src.value
                  ? "font-semibold text-[#0da594] bg-[#f0faf9]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function StandardBillsTable() {
  const router = useRouter();

  // Filters & pagination state
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceValue | "">("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever any filter changes
  function resetPage() {
    setCurrentPage(1);
  }

  // Legal entity
  const { data: legalEntitiesData } = useTransactionLegalEntities("finance");
  const legalEntityId = legalEntitiesData?.data?.[0]?.legalEntityId ?? "";

  // Map tab key → workflowStage query param
  const workflowStageParam =
    activeTab === "all"
      ? undefined
      : activeTab === "awaiting"
      ? "awaiting_approval"
      : activeTab === "for_payment"
      ? "ready_for_payment"
      : activeTab; // "paid" | "draft" pass through directly

  // ─── API call ──────────────────────────────────────────────────────────────
  // GET /bill-pay/invoices?legalEntityId={id}&source={source}&workflowStage=…&search=…&page=…&limit=…
  const { data: invoicesResponse, isLoading, isError, refetch } = useGetBillPayInvoices(
    {
      legalEntityId,
      page: currentPage,
      limit: pageSize,
      search: search.trim() || undefined,
      source: sourceFilter || undefined,
      workflowStage: workflowStageParam,
    },
    {
      enabled: !!legalEntityId,   // wait until we have the entity id
      refetchInterval: 60_000,
      staleTime: 0,
    }
  );

  const invoices: BillPayInvoice[] = invoicesResponse?.data?.data ?? [];
  const meta = invoicesResponse?.data?.meta;

  const totalEntries = meta?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startEntry = totalEntries === 0 ? 0 : Math.min((currentPage - 1) * pageSize + 1, totalEntries);
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  const pageNumbers = useMemo(() => {
    const maxPagesToShow = 8;
    return Array.from({ length: Math.min(totalPages, maxPagesToShow) }, (_, i) => i + 1);
  }, [totalPages]);

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Sub-filter Tabs */}
        <div className="flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl max-w-full overflow-x-auto shrink-0">
          {[
            { key: "all",         label: "All Bills" },
            { key: "awaiting",    label: "Awaiting Approval" },
            { key: "for_payment", label: "For Payment" },
            { key: "paid",        label: "Paid" },
            { key: "draft",       label: "Draft" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); resetPage(); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 font-semibold shadow-sm"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Source filter, and settings */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor, invoice…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#0da594] placeholder-gray-400 bg-white"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); resetPage(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Source Filter */}
          <SourceFilterDropdown
            value={sourceFilter}
            onChange={(v) => { setSourceFilter(v); resetPage(); }}
          />

          <button
            title="Column settings"
            className="flex items-center justify-center p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors shrink-0 bg-white"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Active filter pills ── */}
      {sourceFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Filters:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0faf9] text-[#0da594] text-xs font-medium border border-[#0da594]/20">
            Source: {BILL_SOURCES.find((s) => s.value === sourceFilter)?.label}
            <button
              onClick={() => { setSourceFilter(""); resetPage(); }}
              className="hover:text-red-500 ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto -mx-5 px-5">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#0da594]" />
            Loading invoices…
          </div>
        ) : isError ? (
          <div className="py-14 text-center">
            <p className="text-sm text-red-500">Failed to load invoices.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-xs font-semibold text-[#0da594] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-medium text-gray-700">No invoices found</p>
            <p className="mt-1 text-xs text-gray-400">
              {sourceFilter || search.trim()
                ? "Try adjusting your filters."
                : "Invoices will appear here once they are created."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">VENDOR NAME</th>
                <th className="py-3 px-4">SOURCE</th>
                <th className="py-3 px-4">AMOUNT</th>
                <th className="py-3 px-4">DUE DATE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv: BillPayInvoice, idx: number) => {
                const id = inv.vendorInvoiceId;
                const displayId = inv.invoiceNumber || `—`;
                const vendorName =
                  (inv as any).vendorName ||
                  inv.description ||
                  "Vendor";
                const nextDue = inv.dueDate
                  ? format(new Date(inv.dueDate), "dd MMM yyyy")
                  : "—";

                return (
                  <tr
                    key={id || idx}
                    onClick={() => router.push(`/bill-pay/${id}`)}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                      {displayId}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-gray-900 whitespace-nowrap">
                      {vendorName}
                    </td>
                    <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                      {getSourceLabel(inv.source)}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-gray-900 whitespace-nowrap">
                      {formatCurrency(inv.amount, inv.currency)}
                    </td>
                    <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                      {nextDue}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <StatusBadge status={inv.workflowStage} />
                    </td>
                    <td
                      className="py-4 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 rounded-xl border border-black/[0.08] shadow-lg"
                        >
                          <DropdownMenuItem
                            onClick={() => router.push(`/bill-pay/${id}`)}
                            className="text-xs cursor-pointer gap-2"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs cursor-pointer gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-gray-500" /> Pay Bill
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs cursor-pointer gap-2">
                            <Download className="w-3.5 h-3.5 text-gray-500" /> Download PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination footer ── */}
      {!isLoading && invoices.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 text-xs text-gray-500 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span>
              Showing {startEntry}–{endEntry} of {totalEntries} entries
            </span>
            <div className="relative inline-flex items-center">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  resetPage();
                }}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1 pr-6 text-xs text-gray-700 font-medium focus:outline-none focus:border-[#0da594] cursor-pointer"
              >
                {[4, 8, 10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  p === currentPage
                    ? "bg-[#0da594] text-white font-semibold shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
