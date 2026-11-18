"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, MoreHorizontal, Search } from "lucide-react";
import { useTransactionLegalEntities } from "@/features/entity-workspace/hooks";
import { useRecurringOccurrences, useRecurringProfiles, type OccurrenceState } from "@/queries/bill-pay/recurring";
import { RecurringCardSubscriptionsTable } from "./RecurringCardSubscriptionsTable";

const views: Array<{ key: "schedules" | OccurrenceState; label: string }> = [
  { key: "schedules", label: "All" }, { key: "upcoming", label: "Upcoming" },
  { key: "due", label: "Due" }, { key: "overdue", label: "Overdue" },
  { key: "matched", label: "Matched" }, { key: "skipped", label: "Skipped" },
];

const money = (value: string | null, currency: string) => value
  ? new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(Number(value))
  : "Variable";

const shortDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`))
  : "—";

const statusStyle = (status: string) => status === "active" || status === "matched"
  ? "bg-[#f1f9f1] text-[#348a3e]"
  : status === "overdue" || status === "ended"
    ? "bg-[#fef0ef] text-[#ce3c37]"
    : "bg-[#fff8eb] text-[#e29a0b]";

function InvoiceRecurringBillsTable() {
  const router = useRouter();
  const entities = useTransactionLegalEntities("finance");
  const entityOptions = entities.data?.data || [];
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const legalEntityId = entityOptions.some((entity) => entity.legalEntityId === selectedEntityId)
    ? selectedEntityId
    : entityOptions[0]?.legalEntityId || "";
  const [view, setView] = useState<(typeof views)[number]["key"]>("schedules");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState("");
  const [cadence, setCadence] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const schedules = useRecurringProfiles({ legalEntityId, status: scheduleStatus || undefined,
    cadence: cadence || undefined, search: search.trim() || undefined, page, limit: 10 }, view === "schedules");
  const occurrences = useRecurringOccurrences({ legalEntityId, status: view === "schedules" ? undefined : view,
    from: from || undefined, to: to || undefined, page, limit: 10 }, view !== "schedules");
  const selected = view === "schedules" ? schedules : occurrences;
  const meta = selected.data?.meta;

  if (entities.isLoading) return <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">Loading legal entities…</div>;
  if (entities.isError) return <div className="rounded-xl border bg-white p-6 text-sm text-red-600">Could not load legal entities. <button type="button" className="underline" onClick={() => entities.refetch()}>Try again</button></div>;
  if (!legalEntityId || legalEntityId === "all") return <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">Select one legal entity to view recurring bills.</div>;

  return <section className="rounded-xl border border-[#eaecf0] bg-white p-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-[#f0f1f2] p-1" role="tablist" aria-label="Recurring bill status">
        {views.map((item) => <button key={item.key} type="button" onClick={() => { setView(item.key); setPage(1); }}
          role="tab" aria-selected={view === item.key}
          className={`whitespace-nowrap rounded-md px-4 py-2 text-xs font-medium ${view === item.key ? "bg-white text-[#181d27] shadow-sm" : "text-[#66737f] hover:text-[#181d27]"}`}>
          {item.label}
        </button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
      {view === "schedules" && <label className="flex h-10 items-center gap-2 rounded-lg border border-[#eaecf0] px-3 text-[#66737f]">
        <Search size={16} aria-hidden="true" />
        <input aria-label="Search recurring schedules" value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search"
          className="w-32 bg-transparent text-xs outline-none sm:w-40" />
      </label>}
      <button type="button" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}
        className="flex h-10 items-center gap-2 rounded-lg border border-[#eaecf0] px-3 text-xs font-medium text-[#1a2e40]">
        <Filter size={16} aria-hidden="true" /> Filter
      </button>
      </div>
    </div>
    {showFilters && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-[#f9fafb] p-3">
      {!entities.workspaceEnabled && entityOptions.length > 1 && <select aria-label="Legal entity" value={legalEntityId}
        onChange={(event) => { setSelectedEntityId(event.target.value); setPage(1); }}
        className="h-9 rounded-lg border border-[#eaecf0] bg-white px-3 text-xs">
        {entityOptions.map((entity) => <option key={entity.legalEntityId} value={entity.legalEntityId}>{entity.legalName}</option>)}
      </select>}
    {view === "schedules" ? <>
      <select aria-label="Schedule status" value={scheduleStatus} onChange={(event) => { setScheduleStatus(event.target.value); setPage(1); }}
        className="h-9 rounded-lg border border-[#eaecf0] bg-white px-3 text-xs">
        <option value="">All states</option><option value="active">Active</option><option value="paused">Paused</option><option value="ended">Ended</option>
      </select>
      <select aria-label="Cadence" value={cadence} onChange={(event) => { setCadence(event.target.value); setPage(1); }}
        className="h-9 rounded-lg border border-[#eaecf0] bg-white px-3 text-xs">
        <option value="">All cadences</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
      </select>
    </> : <>
      <label>From <input aria-label="Expected from date" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }}
        className="ml-1 rounded-lg border border-gray-200 px-2 py-1.5" /></label>
      <label>To <input aria-label="Expected to date" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }}
        className="ml-1 rounded-lg border border-gray-200 px-2 py-1.5" /></label>
    </>}</div>}
    {selected.isLoading ? <div className="py-12 text-center text-sm text-gray-500">Loading recurring bills…</div>
      : selected.isError ? <div className="py-12 text-center text-sm text-red-600">Could not load recurring bills. <button type="button" className="underline" onClick={() => selected.refetch()}>Try again</button></div>
      : (selected.data?.data.length || 0) === 0 ? <div className="py-12 text-center text-sm text-gray-500">{view === "schedules" ? "No recurring schedules yet." : `No ${view} occurrences.`}</div>
      : <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left text-xs">
        <thead><tr className="border-y border-[#eaecf0] bg-[#f9fafb] text-[10px] uppercase tracking-wide text-[#485866]">
          <th className="px-4 py-3">ID</th><th className="px-4 py-3">Vendor name</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Amount</th>
          <th className="px-4 py-3">Frequency</th><th className="px-4 py-3">Next due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th>
        </tr></thead>
        <tbody>{view === "schedules" ? (schedules.data?.data || []).map((row) => <tr key={row.recurringBillId}
          className="border-b border-[#f0f1f2] text-[#1a2e40] hover:bg-[#f9fafb]">
          <td className="px-4 py-4 font-medium" title={row.recurringBillId}>{row.recurringBillId.slice(0, 8)}</td>
          <td className="px-4 py-4 font-semibold">{row.vendorName || "Vendor"}</td><td className="px-4 py-4">{row.description}</td>
          <td className="px-4 py-4">{money(row.expectedAmount, row.currency)}</td><td className="px-4 py-4 capitalize">{row.cadence}</td>
          <td className="px-4 py-4">{shortDate(row.nextExpectedDate)}</td>
          <td className="px-4 py-4"><span className={`rounded-md px-2 py-1 capitalize ${statusStyle(row.status)}`}>{row.status}</span></td>
          <td className="px-4 py-4"><button type="button" aria-label={`View ${row.vendorName || "recurring bill"} schedule`}
            className="rounded-md p-1 text-[#66737f] hover:bg-[#eaecf0]" onClick={() => router.push(`/bill-pay/recurring/${row.recurringBillId}`)}><MoreHorizontal size={18} aria-hidden="true" /></button></td>
        </tr>) : (occurrences.data?.data || []).map((row) => <tr key={row.recurringBillOccurrenceId}
          className="border-b border-[#f0f1f2] text-[#1a2e40] hover:bg-[#f9fafb]">
          <td className="px-4 py-4 font-medium" title={row.recurringBillOccurrenceId}>{row.recurringBillOccurrenceId.slice(0, 8)}</td>
          <td className="px-4 py-4 font-semibold">{row.vendorName || "Vendor"}</td><td className="px-4 py-4">{row.description}</td>
          <td className="px-4 py-4">{money(row.expectedAmount, row.currency)}</td><td className="px-4 py-4 capitalize">{row.cadence}</td>
          <td className="px-4 py-4">{shortDate(row.expectedDate)}</td>
          <td className="px-4 py-4"><span className={`rounded-md px-2 py-1 capitalize ${statusStyle(row.status)}`}>{row.status}</span></td>
          <td className="px-4 py-4"><button type="button" aria-label={`View ${row.vendorName || "recurring bill"} schedule`}
            className="rounded-md p-1 text-[#66737f] hover:bg-[#eaecf0]" onClick={() => router.push(`/bill-pay/recurring/${row.recurringBillId}`)}><MoreHorizontal size={18} aria-hidden="true" /></button></td>
        </tr>)}</tbody>
      </table></div>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#485866]">
      <span>{meta ? `Showing ${meta.totalCount ? (page - 1) * 10 + 1 : 0}–${Math.min(page * 10, meta.totalCount)} of ${meta.totalCount} entries` : ""}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded-md px-3 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="rounded-md bg-[#00b8a9] px-3 py-2 text-white">{page}</span>
        <button type="button" className="rounded-md px-3 py-2 disabled:opacity-40" disabled={page >= (meta?.totalPages || 1)} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  </section>;
}

export function RecurringBillsTable() {
  const [type, setType] = useState<"invoice" | "card">("invoice");
  return <div className="space-y-4">
    <div className="inline-flex rounded-xl border border-black/[0.04] bg-[#edeef0] p-1">
      <button type="button" onClick={() => setType("invoice")}
        className={`rounded-lg px-4 py-2 text-xs font-semibold ${type === "invoice" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
        Vendor invoices
      </button>
      <button type="button" onClick={() => setType("card")}
        className={`rounded-lg px-4 py-2 text-xs font-semibold ${type === "card" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
        Company card subscriptions
      </button>
    </div>
    {type === "invoice" ? <InvoiceRecurringBillsTable /> : <RecurringCardSubscriptionsTable />}
  </div>;
}
