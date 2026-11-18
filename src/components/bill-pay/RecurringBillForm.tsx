"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useTransactionLegalEntities } from "@/features/entity-workspace/hooks";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { useEligibleInvoiceVendors } from "@/features/bill-pay/intake/manual/queries";
import { resolveRecurringEntityId } from "./recurring-entity";
import {
  useCreateRecurring, useUpdateRecurring, type RecurringCadence, type RecurringProfile,
} from "@/queries/bill-pay/recurring";
import { useCreateRecurringCardSubscription } from "@/queries/bill-pay/recurring-card";

export function RecurringBillForm({ profile, lockSchedule = false, onSaved, onCardSaved, onCancel }: {
  profile?: RecurringProfile; lockSchedule?: boolean; onSaved: (id: string) => void;
  onCardSaved?: (id: string) => void; onCancel?: () => void;
}) {
  const entities = useTransactionLegalEntities("finance");
  const options = entities.data?.data?.filter((entity) => entity.legalEntityId !== "all") || [];
  const workspaceSelection = useEntityWorkspaceStore((state) => state.selection);
  const primaryAssignmentId = useEntityWorkspaceStore(
    (state) => state.snapshot?.primaryAssignment?.legalEntityId || null,
  );
  const [legacyChoiceId, setLegacyChoiceId] = useState("");
  const [choosingEntity, setChoosingEntity] = useState(false);
  const selectedEntityId = resolveRecurringEntityId(options, {
    profileEntityId: profile?.legalEntityId,
    workspaceEnabled: entities.workspaceEnabled,
    workspaceSelection,
    primaryAssignmentId,
    legacyChoiceId,
  });
  const selectedEntity = options.find((entity) => entity.legalEntityId === selectedEntityId);
  const canChangeEntity = !profile && !entities.workspaceEnabled && options.length > 1;
  const vendors = useEligibleInvoiceVendors(selectedEntityId);
  const [vendorId, setVendorId] = useState(profile?.vendorId || "");
  const previousEntityId = useRef(selectedEntityId);
  useEffect(() => {
    if (!profile && previousEntityId.current && previousEntityId.current !== selectedEntityId)
      setVendorId("");
    previousEntityId.current = selectedEntityId;
  }, [selectedEntityId, profile]);
  const [description, setDescription] = useState(profile?.description || "");
  const [cadence, setCadence] = useState<RecurringCadence>(profile?.cadence || "monthly");
  const [firstDate, setFirstDate] = useState(profile?.firstExpectedInvoiceDate || "");
  const [endDate, setEndDate] = useState(profile?.endDate || "");
  const [expectedAmount, setExpectedAmount] = useState(profile?.expectedAmount || "");
  const [variancePercent, setVariancePercent] = useState(profile?.variancePercent || "");
  const [paymentType, setPaymentType] = useState<"invoice" | "card_subscription">("invoice");
  const [step, setStep] = useState<1 | 2>(1);
  const [merchantName, setMerchantName] = useState("");
  const [subscriptionName, setSubscriptionName] = useState("");
  const [cardFirstDate, setCardFirstDate] = useState("");
  const [cardExpectedAmount, setCardExpectedAmount] = useState("");
  const [cardVariancePercent, setCardVariancePercent] = useState("");
  const create = useCreateRecurring();
  const createCard = useCreateRecurringCardSubscription();
  const update = useUpdateRecurring();
  const pending = create.isPending || update.isPending || createCard.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile && paymentType === "invoice" && step === 1) {
      if (!selectedEntityId || !vendorId || !description.trim() || !firstDate) {
        toast.error("Choose a vendor and enter a description and start date.");
        return;
      }
      setStep(2);
      return;
    }
    if (paymentType === "card_subscription") {
      if (!selectedEntityId || !merchantName.trim() || !subscriptionName.trim() || !cardFirstDate) {
        toast.error("Enter a merchant, subscription name, and first expected charge date.");
        return;
      }
      try {
        const saved = await createCard.mutateAsync({
          legalEntityId: selectedEntityId,
          merchantName: merchantName.trim(),
          description: subscriptionName.trim(),
          cadence,
          firstExpectedChargeDate: cardFirstDate,
          expectedAmount: cardExpectedAmount || null,
          variancePercent: cardExpectedAmount && cardVariancePercent ? Number(cardVariancePercent) : null,
        });
        toast.success("Card subscription draft saved");
        onCardSaved?.(saved.recurringCardSubscriptionId);
      } catch {
        toast.error("Could not save the card subscription draft. Check the fields and try again.");
      }
      return;
    }
    if (!selectedEntityId || !vendorId || !description.trim() || !firstDate) {
      toast.error("Choose a legal entity, vendor, description, and first expected date.");
      return;
    }
    const input = {
      legalEntityId: selectedEntityId, vendorId, description: description.trim(), cadence,
      firstExpectedInvoiceDate: firstDate, endDate: endDate || null,
      expectedAmount: expectedAmount || null,
      variancePercent: expectedAmount && variancePercent ? Number(variancePercent) : null,
    };
    try {
      const saved = profile
        ? await update.mutateAsync({ id: profile.recurringBillId, expectedVersion: profile.version,
            ...input, ...(lockSchedule ? { cadence: undefined, firstExpectedInvoiceDate: undefined } : {}) })
        : await create.mutateAsync(input);
      toast.success(profile ? "Recurring schedule updated" : "Recurring schedule created");
      onSaved(saved.recurringBillId);
    } catch {
      toast.error("Could not save the recurring schedule. Check the fields and try again.");
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div><h1 className="text-xl font-semibold text-[#1a2e40]">{profile ? "Edit recurring bill" : "Set Up Recurring Bill"}</h1>
      <p className="mt-1 text-sm text-[#66737f]">Track each expected invoice and review the actual bill when it arrives.</p></div>
    {!profile && paymentType === "invoice" && <div className="flex items-center gap-2 text-xs" aria-label="Setup progress">
      <span className={`flex items-center gap-2 ${step === 1 ? "font-semibold text-[#00b8a9]" : "text-[#66737f]"}`}>
        <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${step === 1 ? "bg-[#00b8a9] text-white" : "bg-[#eaecf0]"}`}>1</span> Billing Information
      </span>
      <span className="h-px w-8 bg-[#eaecf0]" />
      <span className={`flex items-center gap-2 ${step === 2 ? "font-semibold text-[#00b8a9]" : "text-[#66737f]"}`}>
        <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${step === 2 ? "bg-[#00b8a9] text-white" : "bg-[#eaecf0]"}`}>2</span> Configuration
      </span>
    </div>}
    <div className="space-y-5 rounded-xl border border-[#eaecf0] bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-base font-semibold text-[#333]">{profile ? "Schedule information" : paymentType === "invoice" && step === 2 ? "Configuration" : "Billing Information"}</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className={`space-y-1 text-sm font-medium ${!profile && paymentType === "invoice" && step === 2 ? "hidden" : ""}`}><span>Legal entity</span>
        {selectedEntityId && !choosingEntity ? (
          <div className="flex h-10 items-center justify-between rounded-lg border bg-gray-50 px-3 text-sm">
            <span>{selectedEntity?.legalName || "Schedule legal entity"}</span>
            {canChangeEntity && <button type="button" className="text-xs font-semibold text-[#087f70]" onClick={() => setChoosingEntity(true)}>Change</button>}
          </div>
        ) : !entities.workspaceEnabled ? (
          <div className="flex items-center gap-2">
            <select aria-label="Legal entity" value={selectedEntityId} onChange={(event) => { setLegacyChoiceId(event.target.value); setChoosingEntity(false); }}
              className="block h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm">
              <option value="">Select legal entity</option>{options.map((entity) => <option key={entity.legalEntityId} value={entity.legalEntityId}>{entity.legalName}</option>)}
            </select>
            {choosingEntity && <button type="button" className="text-xs font-semibold text-gray-600" onClick={() => setChoosingEntity(false)}>Cancel</button>}
          </div>
        ) : (
          <p className="rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-600">Select one legal entity in the workspace to create a schedule.</p>
        )}
      </div>
      {!profile && step === 1 && <fieldset className="space-y-2 sm:col-span-2">
        <legend className="text-sm font-medium">How is this paid?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" aria-pressed={paymentType === "invoice"} onClick={() => setPaymentType("invoice")}
            className={`rounded-xl border p-4 text-left ${paymentType === "invoice" ? "border-[#087f70] bg-[#f3fbf9] ring-1 ring-[#087f70]" : "border-gray-200 hover:bg-gray-50"}`}>
            <span className="block text-sm font-semibold">Vendor invoice</span>
            <span className="mt-1 block text-xs font-normal text-gray-500">The vendor sends an invoice for review and approval.</span>
          </button>
          <button type="button" aria-pressed={paymentType === "card_subscription"} onClick={() => setPaymentType("card_subscription")}
            className={`rounded-xl border p-4 text-left ${paymentType === "card_subscription" ? "border-[#087f70] bg-[#f3fbf9] ring-1 ring-[#087f70]" : "border-gray-200 hover:bg-gray-50"}`}>
            <span className="block text-sm font-semibold">Company card subscription</span>
            <span className="mt-1 block text-xs font-normal text-gray-500">The merchant charges the company card each cycle.</span>
          </button>
        </div>
      </fieldset>}
      {paymentType === "card_subscription" ? <>
        <label className="space-y-1 text-sm font-medium">Merchant
          <input value={merchantName} onChange={(event) => setMerchantName(event.target.value)} maxLength={255} required
            className="block h-10 w-full rounded-lg border px-3 text-sm" placeholder="e.g. Google or OpenAI" />
        </label>
        <label className="space-y-1 text-sm font-medium">Subscription or plan
          <input value={subscriptionName} onChange={(event) => setSubscriptionName(event.target.value)} maxLength={255} required
            className="block h-10 w-full rounded-lg border px-3 text-sm" placeholder="e.g. Google Workspace Business" />
        </label>
        <label className="space-y-1 text-sm font-medium">Cadence
          <select value={cadence} onChange={(event) => setCadence(event.target.value as RecurringCadence)} className="block h-10 w-full rounded-lg border px-3 text-sm">
            <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">First expected charge date
          <input type="date" value={cardFirstDate} onChange={(event) => setCardFirstDate(event.target.value)} required className="block h-10 w-full rounded-lg border px-3 text-sm" />
        </label>
        <label className="space-y-1 text-sm font-medium">Company card
          <select disabled className="block h-10 w-full rounded-lg border bg-gray-50 px-3 text-sm text-gray-500">
            <option>Connect a card feed to select an account</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">Subscription owner
          <select disabled className="block h-10 w-full rounded-lg border bg-gray-50 px-3 text-sm text-gray-500">
            <option>Creator is assigned until owner selection is available</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">Expected amount ({selectedEntity?.baseCurrency || "entity currency"}, optional)
          <input inputMode="decimal" pattern="[0-9]+(\\.[0-9]{1,4})?" value={cardExpectedAmount} onChange={(event) => setCardExpectedAmount(event.target.value)}
            className="block h-10 w-full rounded-lg border px-3 text-sm" placeholder="Used to flag unexpected changes" />
        </label>
        <label className="space-y-1 text-sm font-medium">Variance warning % (optional)
          <input type="number" min="0" max="100" step="0.01" value={cardVariancePercent} disabled={!cardExpectedAmount}
            onChange={(event) => setCardVariancePercent(event.target.value)}
            className="block h-10 w-full rounded-lg border px-3 text-sm" placeholder="e.g. 10" />
        </label>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm sm:col-span-2">
          <p className="font-semibold text-amber-900">Save as a draft</p>
          <p className="mt-1 text-xs text-amber-800">The merchant charges your company card outside Villeto. Saving this draft does not activate transaction matching or pay a bill.</p>
          <p className="mt-2 text-xs text-amber-800">Card account and owner selection will unlock as card feeds and policy controls are connected. Do not enter card numbers here.</p>
        </div>
      </> : <>
      <label className={`space-y-1 text-sm font-medium sm:col-span-2 ${!profile && step === 2 ? "hidden" : ""}`}>Vendor Name
        <select value={vendorId} onChange={(event) => setVendorId(event.target.value)} className="block h-10 w-full rounded-lg border border-[#eaecf0] px-3 text-sm">
          <option value="">Select eligible vendor</option>{vendors.data?.vendors.map((vendor) => <option key={vendor.vendorId} value={vendor.vendorId}>{vendor.name}</option>)}
        </select>
      </label>
      <label className={`space-y-1 text-sm font-medium sm:col-span-2 ${!profile && step === 2 ? "hidden" : ""}`}>Description
        <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={255} required={Boolean(profile || step === 1)}
          className="block h-10 w-full rounded-lg border border-[#eaecf0] px-3 text-sm" placeholder="e.g. AWS Cloud Services — Monthly" />
      </label>
      <label className={`space-y-1 text-sm font-medium ${!profile && step === 1 ? "hidden" : ""}`}>Frequency
        <select value={cadence} disabled={lockSchedule} onChange={(event) => setCadence(event.target.value as RecurringCadence)} className="block h-10 w-full rounded-lg border border-[#eaecf0] px-3 text-sm">
          <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
        </select>
      </label>
      <label className={`space-y-1 text-sm font-medium ${!profile && step === 2 ? "hidden" : ""}`}>Start Date
        <input type="date" required={Boolean(profile || step === 1)} value={firstDate} disabled={lockSchedule} onChange={(event) => setFirstDate(event.target.value)}
          className="block h-10 w-full rounded-lg border border-[#eaecf0] px-3 text-sm" />
      </label>
      <label className={`space-y-1 text-sm font-medium ${!profile && step === 1 ? "hidden" : ""}`}>End Date (optional)
        <input type="date" min={firstDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="block h-10 w-full rounded-lg border border-[#eaecf0] px-3 text-sm" />
      </label>
      <label className={`space-y-1 text-sm font-medium ${!profile && step === 2 ? "hidden" : ""}`}>Expected Amount ({options.find((item) => item.legalEntityId === selectedEntityId)?.baseCurrency || "base currency"}, optional)
        <input inputMode="decimal" value={expectedAmount} onChange={(event) => setExpectedAmount(event.target.value)} pattern="[0-9]+(\\.[0-9]{1,4})?"
          className="block h-10 w-full rounded-lg border border-[#eaecf0] px-3 text-sm" placeholder="0.00" />
      </label>
      <label className={`space-y-1 text-sm font-medium ${!profile && step === 1 ? "hidden" : ""}`}>Amount Tolerance % (optional)
        <input type="number" min="0" max="100" step="0.01" value={variancePercent} disabled={!expectedAmount}
          onChange={(event) => setVariancePercent(event.target.value)}
          className="block h-10 w-full rounded-lg border border-[#eaecf0] px-3 text-sm" placeholder="e.g. 10" />
      </label>
      </>}
    </div>
    {paymentType === "invoice" && vendors.isError && <p className="text-sm text-red-600">Could not load eligible vendors.</p>}
    {lockSchedule && paymentType === "invoice" && <p className="text-xs text-[#68726d]">Cadence and first date are fixed once expected occurrences exist. End this schedule and create a new one to change its cycle.</p>}
    {paymentType === "invoice" && !profile && step === 2 && <div className="rounded-lg bg-[#e6f8f6] p-3 text-xs text-[#1a2e40] sm:col-span-2">
      Each received invoice is matched for review. Amount tolerance only flags differences; it never approves or pays an invoice.
    </div>}
    <div className="flex flex-wrap justify-end gap-3 border-t border-[#eaecf0] pt-5 sm:col-span-2">
      {paymentType === "invoice" && !profile && step === 2 && <button type="button" onClick={() => setStep(1)}
        className="rounded-lg border border-[#485866] px-5 py-2.5 text-sm font-semibold text-[#1a2e40]">Back</button>}
      {onCancel && <button type="button" onClick={onCancel}
        className="rounded-lg border border-[#485866] px-5 py-2.5 text-sm font-semibold text-[#1a2e40]">Cancel</button>}
      <button type="submit" disabled={pending || !selectedEntityId || (paymentType === "invoice" && (!vendorId || vendors.isError))}
        className="rounded-lg bg-[#00b8a9] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Saving…" : paymentType === "card_subscription" ? "Save subscription draft" : profile ? "Save changes" : step === 1 ? "Continue" : "Create schedule"}
      </button>
    </div>
    </div>
  </form>;
}
