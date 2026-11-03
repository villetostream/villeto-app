"use client";

import { useDebounce } from "use-debounce";
import { useListStatistics, countStatistics, amountStatistics } from "@/queries/list-summary";
import { ListPagination } from "@/components/ui/list-pagination";
import { useState } from "react";
import { AlertCircle, CheckCircle2, FileCheck2, Loader2, ReceiptText, Search, XCircle, CreditCard, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { ProcurementMetric, ProcurementPageHeader, ProcurementSection } from "@/components/procurement/ProcurementWorkspace";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProcurementInvoices } from "@/queries/procurement/invoices";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";

const money = (value: number | string, code: string) => new Intl.NumberFormat("en-NG", { style: "currency", currency: code }).format(Number(value) || 0);

import { useRouter } from "next/navigation";

type SortKey = "invoiceNumber" | "amount" | "date" | "status" | "accounting";
type SortDir = "asc" | "desc";

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
      {active
        ? current!.dir === "asc"
          ? <ArrowUp className="w-3 h-3 text-[#087f70] shrink-0" />
          : <ArrowDown className="w-3 h-3 text-[#087f70] shrink-0" />
        : <ChevronsUpDown className="w-3 h-3 opacity-35 shrink-0" />
      }
    </button>
  );
}

function ProcurementInvoicesPage() {
  const router = useRouter();
  const policies = useAuthorizationPolicies();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir } | null>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebounce(search, 250);
  const { data, isPending, isError, isFetching, refetch } = useProcurementInvoices(tab === "all" ? undefined : tab, {
    enabled: debouncedSearch === search, page, limit: 20, search: debouncedSearch, sortBy: sortState?.key, sortOrder: sortState?.dir,
  });
  const statistics = useListStatistics("procurement/invoices", ["procurement-invoices"], {});
  const invoices = data?.data ?? [];
  const filtered = invoices;

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
  const currencies = [...new Set((statistics.data ?? []).filter(b => ["approved", "paid"].includes(b.status)).map(b => b.currency).filter((c): c is string => !!c))];
  const approvedValueLabel = currencies.map(currency => money(amountStatistics(statistics.data, currency, ["approved", "paid"]), currency)).join(" · ") || money(0, "USD");

  return <div className="space-y-5 pb-8 flex-1 flex flex-col min-h-0 overflow-hidden h-full">
    <ProcurementPageHeader title="Vendor invoices" description="Review supplier invoices against the legal entity, PO, receiving evidence, and accounting controls before they become payable." />
    <div className="grid gap-3 sm:grid-cols-3 shrink-0"><ProcurementMetric label="New submissions" value={awaiting} detail="Waiting to enter review" icon={<ReceiptText className="size-4" />} tone="blue" /><ProcurementMetric label="Under review" value={underReview} detail="Matching and accounting checks" icon={<AlertCircle className="size-4" />} tone="amber" /><ProcurementMetric label="Approved value" value={approvedValueLabel} detail="Posted to the AP subledger" icon={<FileCheck2 className="size-4" />} /></div>
    <button type="button" disabled={isFetching} onClick={() => { void refetch(); void statistics.refetch(); }} className="self-end text-[13px] font-semibold text-[#087f70] disabled:opacity-50">Refresh invoices</button>
    <ProcurementSection title="Invoice review queue" description="Invoices received through the vendor portal" className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between shrink-0"><div className="flex gap-1 overflow-x-auto rounded-[9px] bg-[#f3f6f5] p-1">{["all", "submitted", "under_review", "approved", "paid", "rejected"].map((item) => <button key={item} onClick={() => { setTab(item); setPage(1); }} className={`h-8 whitespace-nowrap rounded-[7px] px-4 text-[13px] font-semibold capitalize transition ${tab === item ? "bg-white text-[#111815] shadow-sm" : "text-[#75807b]"}`}>{item.replaceAll("_", " ")}</button>)}</div><div className="relative w-full lg:w-64"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#89918d]" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Invoice, PO, or vendor" className="h-9 w-full rounded-[9px] border border-black/[0.08] pl-9 pr-3 text-[13px] outline-none focus:border-[#0ea894]" /></div></div>
      {isPending ? (
        <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-[#75807b]">
          <Loader2 className="size-4 animate-spin" /> Loading invoices
        </div>
      ) : isError ? (
        <div className="py-16 text-center">
          <p className="text-[13px] text-[#b93643]">Unable to load invoices.</p>
          <button onClick={() => refetch()} className="mt-3 text-[13px] font-semibold text-[#087f70]">Try again</button>
        </div>
      ) : filtered.length ? (
        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="hidden lg:grid lg:grid-cols-[1.5fr_1fr_1fr_140px_120px] gap-3 px-5 py-3 border-b border-black/[0.055] bg-[#f9faf9] sticky top-0 z-10">
            <ColHeader label="Invoice Details" sortKey="invoiceNumber" current={sortState} onSort={handleSort} />
            <ColHeader label="Entity & Amount" sortKey="amount" current={sortState} onSort={handleSort} />
            <ColHeader label="Dates" sortKey="date" current={sortState} onSort={handleSort} />
            <ColHeader label="Status" sortKey="status" current={sortState} onSort={handleSort} />
            <ColHeader label="Accounting" sortKey="accounting" current={sortState} onSort={handleSort} />
          </div>
          <div className="divide-y divide-black/[0.055]">
          {filtered.map((invoice) => (
             <div 
              key={invoice.vendorInvoiceId} 
              onClick={() => router.push(`/procurement/invoices/${invoice.vendorInvoiceId}`)}
              className="group grid gap-3 px-5 py-4 transition hover:bg-[#f8fbfa] lg:grid-cols-[1.5fr_1fr_1fr_140px_120px] lg:items-center cursor-pointer"
            >
              <div>
                <p className="text-[12px] font-semibold text-[#17211d]">{invoice.invoiceNumber || "Invoice"}</p>
                <p className="mt-0.5 text-[10px] text-[#89918d]">{invoice.vendor?.displayName || invoice.vendor?.legalName || "Vendor pending"} · {invoice.poNumber || "Non-PO invoice"}</p>
              </div>
              <div className="hidden lg:block">
                <p className="text-[11px] font-medium text-[#34413b]">{money(invoice.totalAmount, invoice.currency)}</p>
                <p className="mt-0.5 text-[10px] text-[#89918d]">{invoice.legalEntity.legalName}</p>
              </div>
              <div className="hidden lg:block">
                <p className="text-[11px] font-medium text-[#34413b]">
                  {invoice.invoiceDate ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(invoice.invoiceDate)) : "—"}
                </p>
                <p className="mt-0.5 text-[10px] text-[#89918d]">
                  Due: {(invoice.dueDate || invoice.deliveryDate) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(invoice.dueDate || invoice.deliveryDate!)) : "—"}
                </p>
              </div>
              <div className="hidden lg:flex lg:items-center">
                <StatusBadge status={invoice.status} label={invoice.status.replaceAll("_", " ")} />
              </div>
              <div className="hidden lg:flex lg:items-center">
                <StatusBadge status={invoice.accountingSyncStatus} label={invoice.accountingSyncStatus.replaceAll("_", " ")} className="bg-[#f0faf8] text-[#087f70] border-[#087f70]/10 capitalize" />
              </div>
            </div>
          ))}
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-[13px] text-[#89918d]">No invoices match this view.</div>
      )}
    <ListPagination page={page} totalPages={data?.meta?.totalPages ?? 0} totalCount={data?.meta?.totalCount ?? 0} onPageChange={setPage} isFetching={isFetching} />
    </ProcurementSection>
  </div>;
}

export default withPermissions(ProcurementInvoicesPage, [
  { resource: "procurement.vendor_invoice", action: "read_company" },
]);
