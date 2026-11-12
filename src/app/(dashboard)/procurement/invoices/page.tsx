"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  FileCheck2,
  ReceiptText,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useListStatistics, countStatistics, amountStatistics } from "@/queries/list-summary";
import { Pagination } from "@/components/ui/custom-pagination";
import { ProcurementMetric } from "@/components/procurement/ProcurementWorkspace";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProcurementInvoices } from "@/queries/procurement/invoices";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { useDateFilterStore } from "@/stores/useDateFilterStore";

const money = (value: number | string, code: string) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: code }).format(Number(value) || 0);

type SortKey = "invoiceNumber" | "amount" | "date" | "status" | "accounting";
type SortDir = "asc" | "desc";

const TABS = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under review" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid" },
  { key: "rejected", label: "Rejected" },
] as const;

function ActionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="ml-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#d33d44] text-white text-[10px] font-bold"
      style={{ paddingTop: "1px" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ColHeader({
  label,
  sortKey,
  current,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  current: { key: SortKey; dir: SortDir } | null;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current?.key === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider select-none transition-colors ${
        active ? "text-[#0b100e]" : "text-[#89918d] hover:text-[#34413b]"
      } ${className}`}
    >
      {label}
      {active ? (
        current!.dir === "asc" ? (
          <ArrowUp className="w-3 h-3 text-[#087f70] shrink-0" />
        ) : (
          <ArrowDown className="w-3 h-3 text-[#087f70] shrink-0" />
        )
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-35 shrink-0" />
      )}
    </button>
  );
}

function ProcurementInvoicesPage() {
  const router = useRouter();
  const policies = useAuthorizationPolicies();
  const { fromDate, toDate } = useDateFilterStore();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir } | null>({
    key: "date",
    dir: "desc",
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [debouncedSearch] = useDebounce(search, 250);

  const { data, isPending, isError, isFetching, refetch } = useProcurementInvoices(
    tab === "all" ? undefined : tab,
    {
      enabled: debouncedSearch === search,
      page,
      limit: perPage,
      search: debouncedSearch,
      sortBy: sortState?.key,
      sortOrder: sortState?.dir,
    },
  );
  const statistics = useListStatistics("procurement/invoices", ["procurement-invoices"], {});
  const invoices = useMemo(() => data?.data ?? [], [data?.data]);

  const filtered = useMemo(() => {
    if (!fromDate && !toDate) return invoices;
    return invoices.filter((inv) => {
      const rawDate = inv.invoiceDate || inv.createdAt;
      if (!rawDate) return false;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return false;
      if (fromDate && d < fromDate) return false;
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [invoices, fromDate, toDate]);

  const meta = data?.meta;
  const totalCount = fromDate || toDate ? filtered.length : (meta?.totalCount ?? filtered.length);
  const totalPages = meta?.totalPages ?? Math.max(1, Math.ceil(totalCount / perPage));

  const handleSort = (key: SortKey) => {
    setPage(1);
    setSortState((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  const underReview = countStatistics(statistics.data, ["under_review"]);
  const awaiting = countStatistics(statistics.data, ["submitted"]);
  const actionRequiredAll = awaiting + underReview;
  const currencies = [
    ...new Set(
      (statistics.data ?? [])
        .filter((b) => ["approved", "paid"].includes(b.status))
        .map((b) => b.currency)
        .filter((c): c is string => !!c),
    ),
  ];
  const approvedValueLabel =
    currencies
      .map((currency) => money(amountStatistics(statistics.data, currency, ["approved", "paid"]), currency))
      .join(" · ") || money(0, "USD");

  return (
    <div className="space-y-4 pb-6 flex-1 flex flex-col min-h-0 overflow-hidden h-full">
      <div className="grid gap-3 sm:grid-cols-3 shrink-0">
        <ProcurementMetric
          label="New submissions"
          value={awaiting}
          detail="Waiting to enter review"
          icon={<ReceiptText className="size-4" />}
          tone="blue"
          isLoading={statistics.isLoading}
        />
        <ProcurementMetric
          label="Under review"
          value={underReview}
          detail="Matching and accounting checks"
          icon={<AlertCircle className="size-4" />}
          tone="amber"
          isLoading={statistics.isLoading}
        />
        <ProcurementMetric
          label="Approved value"
          value={approvedValueLabel}
          detail="Posted to the AP subledger"
          icon={<FileCheck2 className="size-4" />}
          isLoading={statistics.isLoading}
        />
      </div>

      <section className="overflow-hidden rounded-[15px] border border-black/[0.07] bg-white shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)] flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between shrink-0">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-[9px] bg-[#f3f6f5] p-1">
            {TABS.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setTab(item.key);
                  setPage(1);
                }}
                className={`h-8 whitespace-nowrap rounded-[7px] px-4 text-[11px] font-semibold transition flex items-center ${
                  tab === item.key
                    ? "bg-white text-[#111815] shadow-sm"
                    : "text-[#75807b] hover:text-[#111815]"
                }`}
              >
                {item.label}
                {item.key === "all" && <ActionBadge count={actionRequiredAll} />}
                {item.key === "submitted" && <ActionBadge count={awaiting} />}
                {item.key === "under_review" && <ActionBadge count={underReview} />}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#89918d]" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search invoice, PO, or vendor"
                className="h-9 w-full rounded-[9px] border border-black/[0.08] bg-white pl-9 pr-3 text-[11px] outline-none focus:border-[#0ea894]"
              />
            </div>
            <button
              onClick={() => {
                refetch();
                statistics.refetch();
                toast.success("Invoice queue refreshed");
              }}
              disabled={isPending || isFetching}
              title="Refresh invoice queue"
              className="flex items-center gap-1.5 h-9 px-3 rounded-[9px] border border-black/[0.08] bg-white hover:bg-[#f9faf9] text-[11px] font-semibold text-[#111815] transition shrink-0 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw
                className={`size-3.5 text-[#087f70] ${isPending || isFetching ? "animate-spin" : ""}`}
              />
              <span>{isPending || isFetching ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 flex flex-col modal-scrollbar">
          {/* Sticky column header */}
          <div className="hidden lg:grid lg:grid-cols-[1.5fr_1fr_1fr_140px_120px] gap-3 px-5 py-3 border-b border-black/[0.055] bg-[#f9faf9] sticky top-0 z-10 shrink-0">
            <ColHeader label="Invoice Details" sortKey="invoiceNumber" current={sortState} onSort={handleSort} />
            <ColHeader label="Entity & Amount" sortKey="amount" current={sortState} onSort={handleSort} />
            <ColHeader label="Dates" sortKey="date" current={sortState} onSort={handleSort} />
            <ColHeader label="Status" sortKey="status" current={sortState} onSort={handleSort} />
            <ColHeader label="Accounting" sortKey="accounting" current={sortState} onSort={handleSort} />
          </div>

          {isPending ? (
            <div className="divide-y divide-black/[0.055]">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="grid gap-3 px-5 py-3.5 lg:grid-cols-[1.5fr_1fr_1fr_140px_120px] lg:items-center"
                >
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-36 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                    <div className="h-2.5 w-48 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                  </div>
                  <div className="hidden lg:block space-y-1.5">
                    <div className="h-3.5 w-24 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                    <div className="h-2.5 w-28 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                  </div>
                  <div className="hidden lg:block space-y-1.5">
                    <div className="h-3.5 w-24 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                    <div className="h-2.5 w-28 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                  </div>
                  <div className="hidden lg:flex">
                    <div className="h-5 w-20 animate-pulse rounded-full bg-[#f0f2f1]" />
                  </div>
                  <div className="hidden lg:flex">
                    <div className="h-5 w-20 animate-pulse rounded-full bg-[#f0f2f1]" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
              <p className="text-[12px] text-[#b93643]">Unable to load invoices.</p>
              <button
                onClick={() => refetch()}
                className="mt-3 text-[11px] font-semibold text-[#087f70]"
              >
                Try again
              </button>
            </div>
          ) : filtered.length ? (
            <div className="divide-y divide-black/[0.055]">
              {filtered.map((invoice) => (
                <div
                  key={invoice.vendorInvoiceId}
                  onClick={() => router.push(`/procurement/invoices/${invoice.vendorInvoiceId}`)}
                  className="group grid gap-3 px-5 py-3.5 transition hover:bg-[#f8fbfa] lg:grid-cols-[1.5fr_1fr_1fr_140px_120px] lg:items-center cursor-pointer"
                >
                  <div>
                    <p className="text-[12px] font-semibold text-[#17211d] group-hover:text-[#087f70] transition-colors">
                      {invoice.invoiceNumber || "Invoice"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#89918d]">
                      {invoice.vendor?.displayName || invoice.vendor?.legalName || "Vendor pending"} ·{" "}
                      {invoice.poNumber || "Non-PO invoice"}
                    </p>
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-[11px] font-medium text-[#34413b]">
                      {money(invoice.totalAmount, invoice.currency)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#89918d]">
                      {invoice.legalEntity.legalName}
                    </p>
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-[11px] font-medium text-[#34413b]">
                      {invoice.invoiceDate
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
                            new Date(invoice.invoiceDate),
                          )
                        : "—"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#89918d]">
                      Due:{" "}
                      {invoice.dueDate || invoice.deliveryDate
                        ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
                            new Date(invoice.dueDate || invoice.deliveryDate!),
                          )
                        : "—"}
                    </p>
                  </div>
                  <div className="hidden lg:flex lg:items-center">
                    <StatusBadge
                      status={invoice.status}
                      label={invoice.status.replaceAll("_", " ")}
                    />
                  </div>
                  <div className="hidden lg:flex lg:items-center">
                    <StatusBadge
                      status={invoice.accountingSyncStatus}
                      label={invoice.accountingSyncStatus.replaceAll("_", " ")}
                      className="bg-[#f0faf8] text-[#087f70] border-[#087f70]/10 capitalize"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[12px] text-[#89918d] flex-1">
              No invoices match this view.
            </div>
          )}
        </div>
        <div className="shrink-0">
          <Pagination
            total={totalCount}
            page={meta?.currentPage ?? page}
            perPage={meta?.limit ?? perPage}
            onPage={setPage}
            onPerPage={setPerPage}
            totalPages={totalPages}
          />
        </div>
      </section>
    </div>
  );
}

export default withPermissions(ProcurementInvoicesPage, [
  { resource: "procurement.vendor_invoice", action: "read_company" },
]);
