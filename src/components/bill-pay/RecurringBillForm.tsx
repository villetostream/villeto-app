"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Loader2, Check, Info } from "lucide-react";
import { Receipt2, Cards } from "iconsax-reactjs";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransactionLegalEntities } from "@/features/entity-workspace/hooks";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { useEligibleInvoiceVendors } from "@/features/bill-pay/intake/manual/queries";
import { resolveRecurringEntityId } from "./recurring-entity";
import {
  useCreateRecurring,
  useUpdateRecurring,
  type RecurringCadence,
  type RecurringProfile,
} from "@/queries/bill-pay/recurring";
import { useCreateRecurringCardSubscription } from "@/queries/bill-pay/recurring-card";

interface RecurringBillFormProps {
  profile?: RecurringProfile;
  lockSchedule?: boolean;
  onSaved: (id: string) => void;
  onCardSaved?: (id: string) => void;
  onCancel?: () => void;
}

const CADENCE_OPTIONS: Array<{ value: RecurringCadence; label: string }> = [
  { value: "weekly",    label: "Weekly" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly",    label: "Yearly" },
];

export function RecurringBillForm({
  profile,
  lockSchedule = false,
  onSaved,
  onCardSaved,
  onCancel,
}: RecurringBillFormProps) {
  const entities = useTransactionLegalEntities("finance");
  const options = entities.data?.data?.filter((entity) => entity.legalEntityId !== "all") || [];
  const workspaceSelection = useEntityWorkspaceStore((state) => state.selection);
  const primaryAssignmentId = useEntityWorkspaceStore(
    (state) => state.snapshot?.primaryAssignment?.legalEntityId || null
  );

  const selectedEntityId = resolveRecurringEntityId(options, {
    profileEntityId: profile?.legalEntityId,
    workspaceEnabled: entities.workspaceEnabled,
    workspaceSelection,
    primaryAssignmentId,
    legacyChoiceId: "",
  });

  const selectedEntity = options.find((entity) => entity.legalEntityId === selectedEntityId);

  const vendors = useEligibleInvoiceVendors(selectedEntityId);
  const [vendorId, setVendorId] = useState(profile?.vendorId || "");
  const previousEntityId = useRef(selectedEntityId);

  useEffect(() => {
    if (!profile && previousEntityId.current && previousEntityId.current !== selectedEntityId) {
      setVendorId("");
    }
    previousEntityId.current = selectedEntityId;
  }, [selectedEntityId, profile]);

  // Form states
  const [description, setDescription] = useState(profile?.description || "");
  const [cadence, setCadence] = useState<RecurringCadence>(profile?.cadence || "monthly");
  const [firstDate, setFirstDate] = useState<Date | undefined>(
    profile?.firstExpectedInvoiceDate ? parseISO(profile.firstExpectedInvoiceDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    profile?.endDate ? parseISO(profile.endDate) : undefined
  );
  const [expectedAmount, setExpectedAmount] = useState(profile?.expectedAmount || "");
  const [variancePercent, setVariancePercent] = useState(profile?.variancePercent || "");

  // Card subscription states
  const [paymentType, setPaymentType] = useState<"invoice" | "card_subscription">("invoice");
  const [merchantName, setMerchantName] = useState("");
  const [subscriptionName, setSubscriptionName] = useState("");
  const [cardFirstDate, setCardFirstDate] = useState<Date | undefined>();
  const [cardExpectedAmount, setCardExpectedAmount] = useState("");
  const [cardVariancePercent, setCardVariancePercent] = useState("");

  const create = useCreateRecurring();
  const createCard = useCreateRecurringCardSubscription();
  const update = useUpdateRecurring();
  const pending = create.isPending || update.isPending || createCard.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (paymentType === "card_subscription") {
      if (!selectedEntityId || !merchantName.trim() || !subscriptionName.trim() || !cardFirstDate) {
        toast.error("Please enter a merchant, subscription name, and first expected charge date.");
        return;
      }
      try {
        const saved = await createCard.mutateAsync({
          legalEntityId: selectedEntityId,
          merchantName: merchantName.trim(),
          description: subscriptionName.trim(),
          cadence,
          firstExpectedChargeDate: format(cardFirstDate, "yyyy-MM-dd"),
          expectedAmount: cardExpectedAmount.trim() || null,
          variancePercent:
            cardExpectedAmount && cardVariancePercent ? Number(cardVariancePercent) : null,
        });
        toast.success("Card subscription draft saved");
        onCardSaved?.(saved.recurringCardSubscriptionId);
      } catch {
        toast.error("Could not save the card subscription draft. Please check the fields and try again.");
      }
      return;
    }

    // Vendor Invoice
    if (!selectedEntityId) {
      toast.error("Please select an active legal entity from the top workspace menu.");
      return;
    }
    if (!vendorId) {
      toast.error("Please choose an eligible vendor.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description for this recurring bill.");
      return;
    }
    if (!firstDate) {
      toast.error("Please select the first expected invoice date.");
      return;
    }

    const input = {
      legalEntityId: selectedEntityId,
      vendorId,
      description: description.trim(),
      cadence,
      firstExpectedInvoiceDate: format(firstDate, "yyyy-MM-dd"),
      endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
      expectedAmount: expectedAmount.trim() || null,
      variancePercent: expectedAmount && variancePercent ? Number(variancePercent) : null,
    };

    try {
      const saved = profile
        ? await update.mutateAsync({
            id: profile.recurringBillId,
            expectedVersion: profile.version,
            ...input,
            ...(lockSchedule ? { cadence: undefined, firstExpectedInvoiceDate: undefined } : {}),
          })
        : await create.mutateAsync(input);

      toast.success(profile ? "Recurring schedule updated" : "Recurring schedule created");
      onSaved(saved.recurringBillId);
    } catch {
      toast.error("Could not save the recurring schedule. Please check the fields and try again.");
    }
  }

  const currencySymbol = selectedEntity?.baseCurrency || "NGN";

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* ── Type Selector (Only on New) ── */}
      {!profile && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#10231d] uppercase tracking-wider">
            How is this expense paid?
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPaymentType("invoice")}
              className={`relative flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                paymentType === "invoice"
                  ? "border-[#087f70] bg-[#f0faf8] ring-1 ring-[#087f70] shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  paymentType === "invoice"
                    ? "bg-[#087f70] text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <Receipt2 variant="Bulk" className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <span className="block text-sm font-semibold text-[#10231d]">
                  Vendor Invoice
                </span>
                <span className="mt-0.5 block text-xs text-[#68726d] leading-relaxed">
                  Vendor sends regular invoices. Each bill is automatically matched to this schedule for review and approval.
                </span>
              </div>
              {paymentType === "invoice" && (
                <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[#087f70] text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPaymentType("card_subscription")}
              className={`relative flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all ${
                paymentType === "card_subscription"
                  ? "border-[#087f70] bg-[#f0faf8] ring-1 ring-[#087f70] shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  paymentType === "card_subscription"
                    ? "bg-[#087f70] text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <Cards variant="Bulk" className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <span className="block text-sm font-semibold text-[#10231d]">
                  Company Card Subscription
                </span>
                <span className="mt-0.5 block text-xs text-[#68726d] leading-relaxed">
                  Merchant charges a company card directly each cycle. Track recurring software and cloud subscriptions.
                </span>
              </div>
              {paymentType === "card_subscription" && (
                <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-[#087f70] text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Main Form Card ── */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-base font-semibold text-[#10231d]">
            {profile
              ? "Schedule Details"
              : paymentType === "card_subscription"
              ? "Card Subscription Details"
              : "Recurring Bill Details"}
          </h2>
          <p className="mt-0.5 text-xs text-[#68726d]">
            {paymentType === "card_subscription"
              ? "Specify merchant and billing cycle to monitor charges."
              : "Set up the vendor, cycle, and expected amounts to track upcoming invoices."}
          </p>
        </div>

        {paymentType === "card_subscription" ? (
          /* ── Card Subscription Form ── */
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Merchant name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Merchant Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  maxLength={255}
                  required
                  placeholder="e.g. Google, OpenAI, Figma"
                  className="w-full h-10 px-3 rounded-[10px] border border-black/[0.1] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#087f70] focus:ring-2 focus:ring-[#087f70]/20"
                />
              </div>

              {/* Subscription or plan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Subscription or Plan Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subscriptionName}
                  onChange={(e) => setSubscriptionName(e.target.value)}
                  maxLength={255}
                  required
                  placeholder="e.g. Google Workspace Business Plus"
                  className="w-full h-10 px-3 rounded-[10px] border border-black/[0.1] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#087f70] focus:ring-2 focus:ring-[#087f70]/20"
                />
              </div>

              {/* Cadence (Custom Dropdown) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Cadence <span className="text-red-500">*</span>
                </label>
                <Select
                  value={cadence}
                  onValueChange={(val) => setCadence(val as RecurringCadence)}
                >
                  <SelectTrigger className="w-full h-10 px-3 rounded-[10px] border-black/[0.1] text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#087f70]/20 focus:border-[#087f70]">
                    <SelectValue placeholder="Select cadence" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[12px] border-black/[0.08] shadow-lg">
                    {CADENCE_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* First expected charge date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  First Expected Charge Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  date={cardFirstDate}
                  setDate={setCardFirstDate}
                  placeholder="Select charge date"
                  className="rounded-[10px] border-black/[0.1] text-xs"
                />
              </div>

              {/* Company card (informative preview) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Company Card
                </label>
                <div className="w-full h-10 px-3 rounded-[10px] border border-dashed border-gray-200 bg-gray-50 flex items-center text-xs text-gray-400">
                  Card feed selection will unlock as card feeds connect
                </div>
              </div>

              {/* Subscription owner (informative preview) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Subscription Owner
                </label>
                <div className="w-full h-10 px-3 rounded-[10px] border border-dashed border-gray-200 bg-gray-50 flex items-center text-xs text-gray-400">
                  Creator assigned until team owner controls are enabled
                </div>
              </div>

              {/* Expected amount */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Expected Amount ({currencySymbol}, optional)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]+(\.[0-9]{1,4})?"
                  value={cardExpectedAmount}
                  onChange={(e) => setCardExpectedAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-[10px] border border-black/[0.1] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#087f70] focus:ring-2 focus:ring-[#087f70]/20"
                />
              </div>

              {/* Variance warning % */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Variance Warning % (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={cardVariancePercent}
                  disabled={!cardExpectedAmount}
                  onChange={(e) => setCardVariancePercent(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full h-10 px-3 rounded-[10px] border border-black/[0.1] text-xs text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:border-[#087f70] focus:ring-2 focus:ring-[#087f70]/20"
                />
              </div>
            </div>

            {/* Explanatory callout */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200/80 bg-[#fffbeb] text-xs text-[#92400e]">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900">Direct Card Monitoring</p>
                <p className="leading-relaxed">
                  Merchants charge your company card directly. Saving this draft tracks expectations and flags unexpected charge variances once feeds are connected. Do not enter card numbers.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ── Vendor Invoice Form ── */
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Vendor name (Custom Select Dropdown) */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger className="w-full h-10 px-3 rounded-[10px] border-black/[0.1] text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#087f70]/20 focus:border-[#087f70]">
                    <SelectValue placeholder="Select eligible vendor" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[12px] border-black/[0.08] shadow-lg max-h-60">
                    {vendors.data?.vendors.map((vendor) => (
                      <SelectItem key={vendor.vendorId} value={vendor.vendorId} className="text-xs">
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {vendors.isError && (
                  <p className="text-[11px] text-red-600">Could not load eligible vendors.</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={255}
                  required
                  placeholder="e.g. AWS Cloud Services — Monthly Production Hosting"
                  className="w-full h-10 px-3 rounded-[10px] border border-black/[0.1] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#087f70] focus:ring-2 focus:ring-[#087f70]/20"
                />
              </div>

              {/* Frequency (Cadence Custom Select) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <Select
                  value={cadence}
                  disabled={lockSchedule}
                  onValueChange={(val) => setCadence(val as RecurringCadence)}
                >
                  <SelectTrigger className="w-full h-10 px-3 rounded-[10px] border-black/[0.1] text-xs bg-white text-gray-900 focus:ring-2 focus:ring-[#087f70]/20 focus:border-[#087f70] disabled:bg-gray-50 disabled:text-gray-400">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[12px] border-black/[0.08] shadow-lg">
                    {CADENCE_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Start Date (First Expected Invoice) <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  date={firstDate}
                  setDate={setFirstDate}
                  disabled={lockSchedule}
                  placeholder="Select start date"
                  className="rounded-[10px] border-black/[0.1] text-xs"
                />
              </div>

              {/* End Date (optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  End Date <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <DatePicker
                  date={endDate}
                  setDate={setEndDate}
                  placeholder="Ongoing (no end date)"
                  className="rounded-[10px] border-black/[0.1] text-xs"
                  fromDate={firstDate}
                />
              </div>

              {/* Expected amount */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Expected Amount ({currencySymbol}) <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]+(\.[0-9]{1,4})?"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-[10px] border border-black/[0.1] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#087f70] focus:ring-2 focus:ring-[#087f70]/20"
                />
              </div>

              {/* Amount tolerance % */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Amount Tolerance % <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={variancePercent}
                  disabled={!expectedAmount}
                  onChange={(e) => setVariancePercent(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full h-10 px-3 rounded-[10px] border border-black/[0.1] text-xs text-gray-900 placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:border-[#087f70] focus:ring-2 focus:ring-[#087f70]/20"
                />
              </div>
            </div>

            {lockSchedule && (
              <p className="text-xs text-[#68726d]">
                Cadence and start date are fixed once expected invoice occurrences exist. End this schedule and create a new one to change cycle rules.
              </p>
            )}

            {/* Explanatory callout */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#087f70]/20 bg-[#f0faf8] text-xs text-[#065f55]">
              <Info className="w-4 h-4 text-[#087f70] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-[#087f70]">Automated Invoice Matching</p>
                <p className="leading-relaxed text-[#065f55]">
                  Incoming invoices from this vendor will be linked to each expected cycle. Amount tolerance flags variances during your team's review, but will never automatically approve or release payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-100">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="rounded-xl border-gray-200 text-xs font-semibold h-10 px-5 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={
              pending ||
              !selectedEntityId ||
              (paymentType === "invoice" && (!vendorId || Boolean(vendors.isError)))
            }
            className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-10 px-6 shadow-sm"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </span>
            ) : paymentType === "card_subscription" ? (
              "Save Subscription Draft"
            ) : profile ? (
              "Save Changes"
            ) : (
              "Create Schedule"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
