"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Info,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  StopCircle,
} from "lucide-react";
import { Receipt2, Cards } from "iconsax-reactjs";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { RecurringBillForm } from "@/components/bill-pay/RecurringBillForm";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useAuthStore } from "@/stores/auth-stores";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import {
  useDismissRecurringMatch,
  useMatchRecurring,
  useRecurringCandidates,
  useRecurringProfile,
  useRecurringTransition,
  useSkipRecurring,
  type RecurringCandidate,
  type RecurringOccurrence,
} from "@/queries/bill-pay/recurring";

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value.slice(0, 10)), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function formatCurrency(amount: string | number | null, currency: string = "NGN") {
  if (amount == null || amount === "") return "Variable";
  const numeric = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(numeric);
}

function OccurrenceReview({
  occurrence,
  canReview,
}: {
  occurrence: RecurringOccurrence;
  canReview: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  const candidatesQuery = useRecurringCandidates(
    occurrence.recurringBillOccurrenceId,
    open && occurrence.status !== "matched" && occurrence.status !== "skipped"
  );
  const match = useMatchRecurring();
  const dismiss = useDismissRecurringMatch();
  const skip = useSkipRecurring();

  async function handleSkip() {
    if (!skipReason.trim()) {
      toast.error("Please enter a reason for skipping this period.");
      return;
    }
    try {
      await skip.mutateAsync({
        occurrenceId: occurrence.recurringBillOccurrenceId,
        reason: skipReason.trim(),
      });
      toast.success("Period marked as skipped");
      setOpen(false);
    } catch {
      toast.error("Could not skip this period.");
    }
  }

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#10231d]">
              {formatDate(occurrence.periodStart)} – {formatDate(occurrence.periodEnd)}
            </span>
            <StatusBadge status={occurrence.status} />
          </div>
          <p className="text-xs text-[#68726d]">
            Expected invoice date: <span className="font-medium text-gray-800">{formatDate(occurrence.expectedDate)}</span>
          </p>
        </div>

        <div>
          {occurrence.vendorInvoiceId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/bill-pay/${occurrence.vendorInvoiceId}`)}
              className="rounded-xl border-[#087f70]/30 text-[#087f70] hover:bg-[#f0faf8] text-xs font-semibold h-9 px-3 gap-1.5"
            >
              <Receipt2 className="w-3.5 h-3.5" />
              View Matched Bill
            </Button>
          ) : occurrence.status === "skipped" ? (
            <span className="text-xs text-gray-500 italic bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              Skipped: {occurrence.skipReason || "No invoice expected"}
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(!open)}
              className={`rounded-xl text-xs font-semibold h-9 px-3 transition-colors ${
                open
                  ? "border-[#087f70] text-[#087f70] bg-[#f0faf8]"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {open ? "Hide Received Invoices" : "Review Invoices"}
            </Button>
          )}
        </div>
      </div>

      {/* Review & Candidate Matching Section */}
      {open && (
        <div className="pt-4 border-t border-gray-100 space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600">
              Matching Received Invoices
            </h4>

            {candidatesQuery.isLoading ? (
              <div className="flex items-center gap-2 py-6 text-xs text-gray-500 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-[#087f70]" />
                Scanning for received vendor invoices…
              </div>
            ) : candidatesQuery.isError ? (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 flex items-center justify-between">
                <span>Could not load matching invoice candidates.</span>
                <button
                  type="button"
                  onClick={() => void candidatesQuery.refetch()}
                  className="font-semibold underline"
                >
                  Retry
                </button>
              </div>
            ) : !candidatesQuery.data?.length ? (
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 text-xs text-gray-600 text-center">
                No matching invoice from this vendor has arrived for this cycle yet.
              </div>
            ) : (
              <div className="space-y-3">
                {candidatesQuery.data.map((candidate: RecurringCandidate) => (
                  <div
                    key={candidate.vendorInvoiceId}
                    className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm space-y-3 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-gray-900">
                            Invoice #{candidate.invoiceNumber}
                          </span>
                          <StatusBadge status={candidate.workflowStage} />
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Invoice Date: {formatDate(candidate.invoiceDate)}
                        </p>
                      </div>
                      <span className="font-bold text-sm text-gray-900">
                        {formatCurrency(candidate.amount, candidate.currency)}
                      </span>
                    </div>

                    {/* Match Reasons & Variance */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {candidate.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium"
                        >
                          {r.replace(/_/g, " ")}
                        </span>
                      ))}
                      {candidate.varianceWarning && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                          Amount varies {candidate.variancePercent}% from expectation
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {canReview && (
                      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                        <Button
                          type="button"
                          disabled={match.isPending}
                          onClick={async () => {
                            try {
                              await match.mutateAsync({
                                occurrenceId: occurrence.recurringBillOccurrenceId,
                                vendorInvoiceId: candidate.vendorInvoiceId,
                              });
                              toast.success("Invoice linked successfully! Review in Standard Bills.");
                              setOpen(false);
                            } catch {
                              toast.error("Could not link this invoice.");
                            }
                          }}
                          className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-8 px-3"
                        >
                          {match.isPending ? "Linking…" : "Confirm Match"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={dismiss.isPending}
                          onClick={async () => {
                            try {
                              await dismiss.mutateAsync({
                                occurrenceId: occurrence.recurringBillOccurrenceId,
                                vendorInvoiceId: candidate.vendorInvoiceId,
                                invoiceMatchId: candidate.invoiceMatchId,
                              });
                              toast.success("Suggestion dismissed");
                            } catch {
                              toast.error("Could not dismiss this suggestion.");
                            }
                          }}
                          className="rounded-xl border-gray-200 text-xs font-semibold h-8 px-3 text-gray-600 hover:bg-gray-50"
                        >
                          Dismiss
                        </Button>
                        <button
                          type="button"
                          onClick={() => router.push(`/bill-pay/${candidate.vendorInvoiceId}`)}
                          className="text-xs font-semibold text-[#087f70] hover:underline ml-auto"
                        >
                          View Bill Details →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skip Period Option */}
          {canReview && (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                No bill expected for this cycle? Provide a reason to mark as skipped:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  maxLength={1000}
                  placeholder="e.g. Free trial month or service paused"
                  className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#087f70]"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={skip.isPending || !skipReason.trim()}
                  onClick={handleSkip}
                  className="rounded-xl border-gray-200 text-xs font-semibold h-9 px-4 text-gray-700 hover:bg-gray-50"
                >
                  {skip.isPending ? "Skipping…" : "Skip Period"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecurringBillDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();
  const id = params.id as string;
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);

  const profileQuery = useRecurringProfile(id, page);
  const transition = useRecurringTransition();
  const can = useAuthStore((state) => state.can);
  const canEdit = can("bill_pay.invoice", "edit");
  const canReview = can("bill_pay.invoice", "review");

  useEffect(() => {
    setBackHandler(() => router.push("/bill-pay"));
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router]);

  async function handleStateTransition(action: "pause" | "resume" | "end") {
    try {
      await transition.mutateAsync({ id, action });
      toast.success(
        `Schedule ${action === "end" ? "ended" : action === "pause" ? "paused" : "resumed"}`
      );
    } catch {
      toast.error("Could not update this schedule status.");
    }
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin text-[#087f70]" />
        Loading recurring schedule…
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-sm font-semibold text-red-600">Could not load this recurring schedule.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void profileQuery.refetch()}
          className="rounded-xl text-xs font-semibold"
        >
          Try again
        </Button>
      </div>
    );
  }

  const value = profileQuery.data;
  const history = value.occurrences;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#10231d]">
              {value.vendorName || "Vendor Schedule"}
            </h1>
            <StatusBadge status={value.status} />
          </div>
          <p className="mt-1 text-xs text-[#68726d]">
            {value.description} · ID: {value.recurringBillId.slice(0, 8)}
          </p>
        </div>

        {canEdit && value.status !== "ended" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(!editing)}
              className="rounded-xl border-[#087f70] text-[#087f70] hover:bg-[#f0faf8] text-xs font-semibold h-9 px-4"
            >
              {editing ? "Close Editor" : "Edit Schedule"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={transition.isPending}
              onClick={() => handleStateTransition(value.status === "active" ? "pause" : "resume")}
              className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold h-9 px-4 gap-1.5"
            >
              {value.status === "active" ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600" /> Pause Schedule
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-600" /> Resume Schedule
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={transition.isPending}
              onClick={() => handleStateTransition("end")}
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold h-9 px-4 gap-1.5"
            >
              <StopCircle className="w-3.5 h-3.5" /> End Schedule
            </Button>
          </div>
        )}
      </div>

      {/* Edit Form Drawer / Card */}
      {editing && (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm">
          <RecurringBillForm
            key={`${value.recurringBillId}-${value.version}`}
            profile={value}
            lockSchedule={history.meta.totalCount > 0}
            onSaved={() => {
              setEditing(false);
              void profileQuery.refetch();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}

      {/* Two-Column Overview & Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Hero Amount & Key Metrics */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-6">
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-gray-400">
                Expected Amount per Cycle
              </p>
              <p className="mt-1 text-3xl font-extrabold text-[#087f70]">
                {formatCurrency(value.expectedAmount, value.currency)}
                <span className="text-xs font-medium text-[#68726d] ml-1.5">
                  / {value.cadence.replace("ly", "")}
                </span>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-gray-100">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Frequency
                </p>
                <p className="mt-1 font-semibold text-xs text-gray-900 capitalize">
                  {value.cadence}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Start Date
                </p>
                <p className="mt-1 font-semibold text-xs text-gray-900">
                  {formatDate(value.firstExpectedInvoiceDate)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  End Date
                </p>
                <p className="mt-1 font-semibold text-xs text-gray-900">
                  {value.endDate ? formatDate(value.endDate) : "Ongoing"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Next Expected Invoice
                </p>
                <p className="mt-1 font-semibold text-xs text-gray-900">
                  {formatDate(value.nextExpectedDate)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Amount Tolerance
                </p>
                <p className="mt-1 font-semibold text-xs text-gray-900">
                  {value.variancePercent ? `±${value.variancePercent}%` : "No tolerance threshold"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Approval Policy
                </p>
                <p className="mt-1 font-semibold text-xs text-gray-900">
                  Review required on receipt
                </p>
              </div>
            </div>
          </div>

          {/* Expected Invoice Periods (Occurrences) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#10231d]">
                  Expected Invoice Periods
                </h2>
                <p className="text-xs text-[#68726d]">
                  Each billing period generated for this recurring schedule.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {history.meta.totalCount} {history.meta.totalCount === 1 ? "period" : "periods"}
              </span>
            </div>

            {history.data.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/[0.06] p-8 text-center text-xs text-gray-500 shadow-sm">
                No expected invoice periods generated yet.
              </div>
            ) : (
              <div className="space-y-3">
                {history.data.map((occurrence: RecurringOccurrence) => (
                  <OccurrenceReview
                    key={occurrence.recurringBillOccurrenceId}
                    occurrence={occurrence}
                    canReview={canReview}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {history.meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                <span>
                  Page {page} of {history.meta.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg text-xs h-8 px-3"
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page >= history.meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg text-xs h-8 px-3"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Platform Standard Dark Progress Card */}
          <div className="bg-[#10231d] rounded-2xl p-5 text-white shadow-sm space-y-4">
            <h3 className="font-semibold text-sm text-white">Schedule Progress</h3>

            <div className="space-y-4">
              {/* Step 1: Created */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#087f70] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-white">Schedule Active</p>
                  <p className="text-[11px] text-gray-300">
                    Started {formatDate(value.firstExpectedInvoiceDate)}
                  </p>
                </div>
              </div>

              {/* Step 2: Tracking */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#087f70]/30 border border-[#087f70] flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#087f70]" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-white">Next Invoice</p>
                  <p className="text-[11px] text-gray-300">
                    Due {formatDate(value.nextExpectedDate)}
                  </p>
                </div>
              </div>

              {/* Step 3: Review */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Receipt2 className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-xs text-white/70">Bill Matching</p>
                  <p className="text-[11px] text-gray-400">
                    Received invoices held for review before release
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Rules Card */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-3">
            <h4 className="font-semibold text-xs text-[#10231d]">Workflow Rules</h4>
            <div className="text-xs text-[#68726d] space-y-2">
              <p>
                • Invoices matching the vendor name and period are held for reviewer confirmation.
              </p>
              <p>
                • Amount tolerances flag unexpected price increases without releasing payments automatically.
              </p>
              <p>
                • Matched invoices proceed to Standard Bills for 3-way check and authorization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withPermissions(RecurringBillDetailsPage, [
  { resource: "bill_pay.invoice", action: "view" },
]);
