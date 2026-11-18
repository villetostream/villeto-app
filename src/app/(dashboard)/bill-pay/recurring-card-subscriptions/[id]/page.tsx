"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useEndRecurringCardSubscription, useRecurringCardSubscription } from "@/queries/bill-pay/recurring-card";

function RecurringCardSubscriptionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const subscription = useRecurringCardSubscription(params.id);
  const end = useEndRecurringCardSubscription();
  const row = subscription.data;

  return <div className="mx-auto max-w-4xl space-y-5 pb-8">
    <button type="button" onClick={() => router.push("/bill-pay")}
      className="text-sm font-medium text-[#087f70]">← Back to Bill Pay</button>
    {subscription.isLoading ? <div className="rounded-xl border bg-white p-8 text-sm text-gray-500">Loading subscription…</div>
      : subscription.isError || !row ? <div className="rounded-xl border bg-white p-8 text-sm text-red-600">Could not load this card subscription.</div>
      : <>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h1 className="text-xl font-semibold text-[#10231d]">{row.merchantName}</h1>
              <p className="mt-1 text-sm text-gray-500">{row.description}</p></div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              {row.status === "draft" ? "Draft · monitoring pending" : row.status}
            </span>
          </div>
          <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-gray-500">Cadence</p><p className="capitalize">{row.cadence}</p></div>
            <div><p className="text-xs text-gray-500">First expected charge</p><p>{row.firstExpectedChargeDate}</p></div>
            <div><p className="text-xs text-gray-500">Expected amount</p><p>{row.expectedAmount ? `${row.currency} ${row.expectedAmount}` : "Variable"}</p></div>
            <div><p className="text-xs text-gray-500">Variance warning</p><p>{row.variancePercent ? `${row.variancePercent}%` : "None"}</p></div>
          </div>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            The merchant charges the company card directly. This draft does not monitor or pay charges yet.
            Imported card transactions appear in Card Transactions, separate from Standard Bills.
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="rounded-lg border px-4 py-2 text-sm font-medium" onClick={() => router.push("/expenses/card-transactions")}>View card transactions</button>
            {row.status !== "ended" && <button type="button" disabled={end.isPending}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
              onClick={async () => { try { await end.mutateAsync(row.recurringCardSubscriptionId); toast.success("Subscription ended"); } catch { toast.error("Could not end subscription"); } }}>
              End tracking
            </button>}
          </div>
        </div>
      </>}
  </div>;
}

export default withPermissions(RecurringCardSubscriptionPage, [{ resource: "bill_pay.invoice", action: "view" }]);
