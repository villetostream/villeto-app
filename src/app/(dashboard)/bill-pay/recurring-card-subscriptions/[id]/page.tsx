"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Info, Loader2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  useEndRecurringCardSubscription,
  useRecurringCardSubscription,
} from "@/queries/bill-pay/recurring-card";

function formatCurrency(amount: string | number | null, currency: string = "NGN") {
  if (amount == null || amount === "") return "Variable";
  const numeric = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(numeric);
}

function RecurringCardSubscriptionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const subscription = useRecurringCardSubscription(params.id);
  const end = useEndRecurringCardSubscription();
  const row = subscription.data;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {subscription.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin text-[#087f70]" />
          Loading card subscription…
        </div>
      ) : subscription.isError || !row ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-xs text-red-700 space-y-3">
          <p className="font-semibold">Could not load this company card subscription.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void subscription.refetch()}
            className="rounded-xl text-xs font-semibold"
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#10231d]">{row.merchantName}</h1>
                <StatusBadge
                  status={row.status}
                  label={row.status === "draft" ? "Draft · Monitoring Pending" : undefined}
                />
              </div>
              <p className="mt-1 text-xs text-[#68726d]">{row.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/expenses/card-transactions")}
                className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold h-9 px-4 gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 text-gray-500" /> View Card Transactions
              </Button>
              {row.status !== "ended" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={end.isPending}
                  onClick={async () => {
                    try {
                      await end.mutateAsync(row.recurringCardSubscriptionId);
                      toast.success("Subscription tracking ended");
                    } catch {
                      toast.error("Could not end this subscription tracking.");
                    }
                  }}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold h-9 px-4 gap-1.5"
                >
                  <StopCircle className="w-3.5 h-3.5" /> End Tracking
                </Button>
              )}
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-6">
            <div>
              <p className="text-xs uppercase font-semibold tracking-wider text-gray-400">
                Expected Recurring Charge
              </p>
              <p className="mt-1 text-3xl font-extrabold text-[#087f70]">
                {formatCurrency(row.expectedAmount, row.currency)}
                <span className="text-xs font-medium text-[#68726d] ml-1.5">
                  / {row.cadence.replace("ly", "")}
                </span>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Cadence
                </p>
                <p className="mt-1 font-semibold text-xs text-gray-900 capitalize">
                  {row.cadence}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  First Expected Charge
                </p>
                <p className="mt-1 font-semibold text-xs text-gray-900">
                  {row.firstExpectedChargeDate}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Variance Warning
                </p>
                <p className="mt-1 font-semibold text-xs text-gray-900">
                  {row.variancePercent ? `±${row.variancePercent}%` : "No threshold"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Status
                </p>
                <p className="mt-1 font-semibold text-xs text-gray-900 capitalize">
                  {row.status === "draft" ? "Draft" : row.status}
                </p>
              </div>
            </div>

            {/* Informational callout banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200/80 bg-[#fffbeb] text-xs text-[#92400e]">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900">Company Card Charge Monitoring</p>
                <p className="leading-relaxed">
                  The merchant charges your company card directly on their billing cycle. Imported card transactions appear under Card Transactions in the Expenses module, completely separate from vendor invoices.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withPermissions(RecurringCardSubscriptionPage, [
  { resource: "bill_pay.invoice", action: "view" },
]);
