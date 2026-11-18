"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { RecurringBillForm } from "@/components/bill-pay/RecurringBillForm";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useAuthStore } from "@/stores/auth-stores";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import {
  useDismissRecurringMatch, useMatchRecurring, useRecurringCandidates,
  useRecurringProfile, useRecurringTransition, useSkipRecurring,
  type RecurringOccurrence,
} from "@/queries/bill-pay/recurring";

const shortDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`))
  : "—";

function OccurrenceReview({ occurrence, canReview }: { occurrence: RecurringOccurrence; canReview: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const candidates = useRecurringCandidates(occurrence.recurringBillOccurrenceId, open && occurrence.status !== "matched" && occurrence.status !== "skipped");
  const match = useMatchRecurring();
  const dismiss = useDismissRecurringMatch();
  const skip = useSkipRecurring();

  async function handleSkip() {
    if (!skipReason.trim()) return toast.error("Enter a reason for skipping this period.");
    try {
      await skip.mutateAsync({ occurrenceId: occurrence.recurringBillOccurrenceId, reason: skipReason.trim() });
      toast.success("Period skipped");
      setOpen(false);
    } catch { toast.error("Could not skip this period."); }
  }

  return <div className="rounded-xl border bg-white p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="font-semibold text-[#10231d]">{occurrence.periodStart} – {occurrence.periodEnd}</p>
        <p className="text-xs text-[#68726d]">Expected invoice: {occurrence.expectedDate} · <span className="capitalize">{occurrence.status}</span></p></div>
      {occurrence.vendorInvoiceId ? <button type="button" className="text-xs font-semibold text-[#087f70] underline"
        onClick={() => router.push(`/bill-pay/${occurrence.vendorInvoiceId}`)}>Open in Standard Bills</button>
        : occurrence.status === "skipped" ? <span className="text-xs text-[#68726d]">{occurrence.skipReason}</span>
          : <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-semibold" onClick={() => setOpen(!open)}>{open ? "Hide review" : "Review invoices"}</button>}
    </div>
    {open && <div className="space-y-3 border-t pt-3">
      {candidates.isLoading ? <p className="text-sm text-gray-500">Finding received invoices…</p>
        : candidates.isError ? <p className="text-sm text-red-600">Could not load invoice matches. <button type="button" onClick={() => candidates.refetch()} className="underline">Retry</button></p>
          : !candidates.data?.length ? <p className="text-sm text-gray-500">No matching vendor invoice has arrived for this period.</p>
            : candidates.data.map((candidate) => <div key={candidate.vendorInvoiceId} className="rounded-lg border p-3 text-sm space-y-2">
              <div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">Invoice {candidate.invoiceNumber}</p>
                <p className="text-xs text-gray-500">Dated {candidate.invoiceDate} · {candidate.workflowStage.replaceAll("_", " ")}</p></div>
                <p className="font-semibold">{candidate.currency} {candidate.amount}</p></div>
              <p className="text-xs text-gray-500">{candidate.reasons.join(", ").replaceAll("_", " ")}
                {candidate.varianceWarning && ` · Amount varies ${candidate.variancePercent}% from expectation`}</p>
              {canReview && <div className="flex gap-2">
                <button type="button" disabled={match.isPending} className="rounded-lg bg-[#087f70] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  onClick={async () => { try { await match.mutateAsync({ occurrenceId: occurrence.recurringBillOccurrenceId, vendorInvoiceId: candidate.vendorInvoiceId }); toast.success("Invoice linked; review it in Standard Bills"); setOpen(false); } catch { toast.error("Could not link this invoice."); } }}>Confirm match</button>
                <button type="button" disabled={dismiss.isPending} className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  onClick={async () => { try { await dismiss.mutateAsync({ occurrenceId: occurrence.recurringBillOccurrenceId, vendorInvoiceId: candidate.vendorInvoiceId, invoiceMatchId: candidate.invoiceMatchId }); toast.success("Suggestion dismissed"); } catch { toast.error("Could not dismiss this match."); } }}>Dismiss</button>
              </div>}
            </div>)}
      {canReview && <div className="flex flex-wrap items-end gap-2 border-t pt-3">
        <label className="flex-1 text-xs font-medium">No invoice expected this period? Give a reason to skip.
          <input value={skipReason} onChange={(event) => setSkipReason(event.target.value)} maxLength={1000}
            className="mt-1 block h-9 w-full rounded-lg border px-2 text-sm" placeholder="Reason for skipping" /></label>
        <button type="button" disabled={skip.isPending || !skipReason.trim()} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50" onClick={handleSkip}>Skip period</button>
      </div>}
    </div>}
  </div>;
}

function RecurringBillDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();
  const id = params.id as string;
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const profile = useRecurringProfile(id, page);
  const transition = useRecurringTransition();
  const can = useAuthStore((state) => state.can);
  const canEdit = can("bill_pay.invoice", "edit");
  const canReview = can("bill_pay.invoice", "review");

  useEffect(() => {
    setBackHandler(() => router.push("/bill-pay"));
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router]);

  async function changeState(action: "pause" | "resume" | "end") {
    try { await transition.mutateAsync({ id, action }); toast.success(`Schedule ${action === "end" ? "ended" : action === "pause" ? "paused" : "resumed"}`); }
    catch { toast.error("Could not change this schedule."); }
  }

  if (profile.isLoading) return <div className="p-6 text-sm text-gray-500">Loading recurring schedule…</div>;
  if (profile.isError || !profile.data) return <div className="p-6 text-sm text-red-600">Could not load this recurring schedule. <button type="button" className="underline" onClick={() => profile.refetch()}>Try again</button></div>;
  const value = profile.data;
  const history = value.occurrences;

  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div>
      <div className="flex items-center gap-3"><h1 className="text-2xl font-semibold text-[#1a2e40]">{value.vendorName || "Vendor"}</h1>
        <span className={`rounded-md px-2 py-1 text-xs font-medium capitalize ${value.status === "active" ? "bg-[#f1f9f1] text-[#348a3e]" : "bg-[#fff8eb] text-[#e29a0b]"}`}>{value.status}</span></div>
      <p className="mt-1 text-sm text-[#66737f]">{value.description}</p>
    </div>{canEdit && value.status !== "ended" && <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded-lg border border-[#00b8a9] px-4 py-2 text-sm font-semibold text-[#00a99c]" onClick={() => setEditing(!editing)}>{editing ? "Close editor" : "Edit Bill"}</button>
      <button type="button" disabled={transition.isPending} className="rounded-lg border border-[#eaecf0] px-4 py-2 text-sm font-semibold text-[#1a2e40]" onClick={() => changeState(value.status === "active" ? "pause" : "resume")}>{value.status === "active" ? "Pause" : "Resume"}</button>
      <button type="button" disabled={transition.isPending} className="rounded-lg bg-[#e53935] px-4 py-2 text-sm font-semibold text-white" onClick={() => changeState("end")}>End schedule</button>
    </div>}</div>
    {editing && <RecurringBillForm key={`${value.recurringBillId}-${value.version}`} profile={value} lockSchedule={history.meta.totalCount > 0}
      onSaved={() => { setEditing(false); void profile.refetch(); }} onCancel={() => setEditing(false)} />}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_230px]">
      <div className="space-y-4">
        <section className="rounded-xl border border-[#eaecf0] bg-white p-5 text-sm">
          <p className="text-2xl font-semibold text-[#00b8a9]">{value.expectedAmount
            ? new Intl.NumberFormat("en-NG", { style: "currency", currency: value.currency }).format(Number(value.expectedAmount))
            : "Variable amount"} <span className="text-xs font-normal text-[#66737f]">/ {value.cadence.replace("ly", "")}</span></p>
          <h2 className="mt-6 font-semibold text-[#333]">Schedule Information</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div><p className="text-[10px] uppercase text-[#66737f]">Frequency</p><p className="mt-1 font-medium capitalize text-[#1a2e40]">{value.cadence}</p></div>
            <div><p className="text-[10px] uppercase text-[#66737f]">Start Date</p><p className="mt-1 font-medium text-[#1a2e40]">{shortDate(value.firstExpectedInvoiceDate)}</p></div>
            <div><p className="text-[10px] uppercase text-[#66737f]">End Date</p><p className="mt-1 font-medium text-[#1a2e40]">{value.endDate ? shortDate(value.endDate) : "Never"}</p></div>
          </div>
        </section>
        <section className="rounded-xl border border-[#eaecf0] bg-white p-5 text-sm">
          <h2 className="font-semibold text-[#333]">Invoice Matching</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div><p className="text-[10px] uppercase text-[#66737f]">Expected Amount</p><p className="mt-1 font-medium text-[#1a2e40]">{value.expectedAmount ? `${value.currency} ${value.expectedAmount}` : "Variable"}</p></div>
            <div><p className="text-[10px] uppercase text-[#66737f]">Amount Tolerance</p><p className="mt-1 font-medium text-[#1a2e40]">{value.variancePercent ? `±${value.variancePercent}%` : "No threshold"}</p></div>
            <div><p className="text-[10px] uppercase text-[#66737f]">Invoice Review</p><p className="mt-1 font-medium text-[#1a2e40]">Required for every invoice</p></div>
          </div>
        </section>
      </div>
      <aside className="self-start overflow-hidden rounded-xl border border-[#eaecf0] bg-white text-sm">
        <h2 className="bg-[#1a2e40] px-4 py-3 font-semibold text-white">Schedule Progress</h2>
        <div className="space-y-4 p-4">
          <div className="border-l-2 border-[#00b8a9] pl-3"><p className="font-medium text-[#1a2e40]">Schedule created</p><p className="mt-1 text-xs text-[#66737f]">Expected invoices are tracked.</p></div>
          <div className="border-l-2 border-[#eaecf0] pl-3"><p className="font-medium text-[#1a2e40]">Next expected invoice</p><p className="mt-1 text-xs text-[#66737f]">{shortDate(value.nextExpectedDate)}</p></div>
          <div className="border-l-2 border-[#eaecf0] pl-3"><p className="font-medium text-[#1a2e40]">Received invoice</p><p className="mt-1 text-xs text-[#66737f]">Review and match each arrival below.</p></div>
        </div>
      </aside>
    </div>
    <div className="space-y-3"><h2 className="text-lg font-semibold">Expected invoice periods</h2>
      {history.data.length === 0 ? <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">No expected periods yet.</div>
        : history.data.map((occurrence) => <OccurrenceReview key={occurrence.recurringBillOccurrenceId} occurrence={occurrence} canReview={canReview} />)}
      <div className="flex items-center gap-3 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button>
        <span>Page {page} of {Math.max(1, history.meta.totalPages)}</span>
        <button type="button" disabled={page >= history.meta.totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div>
    </div>
  </div>;
}

export default withPermissions(RecurringBillDetailsPage, [
  { resource: "bill_pay.invoice", action: "view" },
]);
