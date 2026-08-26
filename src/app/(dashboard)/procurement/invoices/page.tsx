"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, FileCheck2, Loader2, ReceiptText, Search } from "lucide-react";
import { toast } from "sonner";
import { ProcurementMetric, ProcurementPageHeader, ProcurementSection } from "@/components/procurement/ProcurementWorkspace";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useInvoiceAction, useProcurementInvoices } from "@/queries/procurement/invoices";
import { useAuthStore } from "@/stores/auth-stores";
import withPermissions from "@/components/permissions/permission-protected-routes";

const money = (value: number, code: string) => new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(value);

function ProcurementInvoicesPage() {
  const can = useAuthStore((state) => state.can);
  const { data, isLoading, isError, refetch } = useProcurementInvoices();
  const action = useInvoiceAction();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const invoices = useMemo(() => data?.data || [], [data?.data]);
  const filtered = useMemo(() => invoices.filter((invoice) => (tab === "all" || invoice.status === tab) && `${invoice.invoiceNumber} ${invoice.vendor?.displayName || ""} ${invoice.vendor?.legalName || ""} ${invoice.poNumber || ""}`.toLowerCase().includes(search.toLowerCase())), [invoices, search, tab]);
  const underReview = invoices.filter((item) => item.status === "under_review").length;
  const awaiting = invoices.filter((item) => item.status === "submitted").length;
  const approvedValue = invoices.filter((item) => ["approved", "paid"].includes(item.status)).reduce((sum, item) => sum + Number(item.totalAmount), 0);
  const currency = invoices[0]?.currency || "USD";

  const run = async (invoiceId: string, next: "under-review" | "approve" | "reject") => {
    try { await action.mutateAsync({ invoiceId, action: next }); toast.success(next === "approve" ? "Invoice approved and posted" : next === "under-review" ? "Invoice moved into review" : "Invoice rejected"); }
    catch { toast.error("Invoice action could not be completed"); }
  };

  return <div className="space-y-5 pb-8 flex-1 flex flex-col min-h-0 overflow-hidden h-full">
    <ProcurementPageHeader title="Vendor invoices" description="Review supplier invoices against the legal entity, PO, receiving evidence, and accounting controls before they become payable." />
    <div className="grid gap-3 sm:grid-cols-3 shrink-0"><ProcurementMetric label="New submissions" value={awaiting} detail="Waiting to enter review" icon={<ReceiptText className="size-4" />} tone="blue" /><ProcurementMetric label="Under review" value={underReview} detail="Matching and accounting checks" icon={<AlertCircle className="size-4" />} tone="amber" /><ProcurementMetric label="Approved value" value={money(approvedValue, currency)} detail="Posted to the AP subledger" icon={<FileCheck2 className="size-4" />} /></div>
    <ProcurementSection title="Invoice review queue" description="Invoices received through the vendor portal" className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between shrink-0"><div className="flex gap-1 overflow-x-auto rounded-[9px] bg-[#f3f6f5] p-1">{["all", "submitted", "under_review", "approved", "paid", "rejected"].map((item) => <button key={item} onClick={() => setTab(item)} className={`h-8 whitespace-nowrap rounded-[7px] px-4 text-[13px] font-semibold capitalize transition ${tab === item ? "bg-white text-[#111815] shadow-sm" : "text-[#75807b]"}`}>{item.replaceAll("_", " ")}</button>)}</div><div className="relative w-full lg:w-64"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#89918d]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Invoice, PO, or vendor" className="h-9 w-full rounded-[9px] border border-black/[0.08] pl-9 pr-3 text-[13px] outline-none focus:border-[#0ea894]" /></div></div>
      {isLoading ? <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-[#75807b]"><Loader2 className="size-4 animate-spin" /> Loading invoices</div> : isError ? <div className="py-16 text-center"><p className="text-[13px] text-[#b93643]">Unable to load invoices.</p><button onClick={() => refetch()} className="mt-3 text-[13px] font-semibold text-[#087f70]">Try again</button></div> : filtered.length ? <div className="divide-y divide-black/[0.055] overflow-auto flex-1 min-h-0">{filtered.map((invoice) => <div key={invoice.vendorInvoiceId} className="grid gap-3 px-5 py-4 transition hover:bg-[#f8fbfa] lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-center"><div><p className="text-[13px] font-semibold text-[#17211d]">{invoice.invoiceNumber}</p><p className="mt-1 text-[11px] text-[#89918d]">{invoice.vendor?.displayName || invoice.vendor?.legalName || "Vendor"} · {invoice.poNumber || "Non-PO invoice"}</p></div><div><p className="text-[11px] text-[#89918d]">{invoice.legalEntity.legalName}</p><p className="mt-1 text-[13px] font-semibold text-[#17211d]">{money(invoice.totalAmount, invoice.currency)}</p></div><StatusBadge status={invoice.status} label={invoice.status.replaceAll("_", " ")} /><span className="text-[10px] font-semibold capitalize text-[#89918d]">Accounting: {invoice.accountingSyncStatus.replaceAll("_", " ")}</span><div className="flex items-center justify-end gap-2">{invoice.status === "submitted" && can("procurement.vendor_invoice", "review") && <button onClick={() => run(invoice.vendorInvoiceId, "under-review")} className="rounded-[8px] border border-black/[0.08] px-3 py-2 text-[12px] font-semibold">Review</button>}{invoice.status === "under_review" && can("procurement.vendor_invoice", "approve") && <button onClick={() => run(invoice.vendorInvoiceId, "approve")} className="inline-flex items-center gap-1 rounded-[8px] bg-[#087f70] px-3 py-2 text-[12px] font-semibold text-white"><CheckCircle2 className="size-3.5" /> Approve</button>}<ArrowRight className="size-3.5 text-[#a6adaa]" /></div></div>)}</div> : <div className="py-16 text-center text-[13px] text-[#89918d]">No invoices match this view.</div>}
    </ProcurementSection>
  </div>;
}

export default withPermissions(ProcurementInvoicesPage, [
  { resource: "procurement.vendor_invoice", action: "read_company" },
]);
