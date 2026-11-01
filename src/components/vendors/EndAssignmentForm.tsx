"use client";

import { useState } from "react";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  requiresPurchasingHold,
  type EndingRelationship,
  type EndingSiteAssignment,
} from "./end-site-assignment";

export function EndAssignmentForm({
  state,
  submitting,
  onClose,
  onSubmit,
}: {
  state: { relationship: EndingRelationship; assignment: EndingSiteAssignment };
  submitting: boolean;
  onClose: () => void;
  onSubmit: (
    reason: string,
    putPurchasingOnHold: boolean,
  ) => Promise<void> | void;
}) {
  const [reason, setReason] = useState("");
  const putPurchasingOnHold = requiresPurchasingHold(
    state.relationship,
    state.assignment,
  );
  const entityName =
    state.relationship.legalEntity?.displayName ||
    state.relationship.legalEntity?.legalName ||
    "this legal entity";
  const purpose = {
    purchasing: "Purchasing",
    invoicing: "Invoicing",
    remit_to: "Remit-to",
  }[state.assignment.purpose];
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {putPurchasingOnHold
            ? "End the last purchasing assignment?"
            : "End site assignment"}
        </DialogTitle>
        <DialogDescription>
          {putPurchasingOnHold ? (
            <>
              This is the last purchasing assignment for {entityName}. Ending it
              will also put purchasing on hold for this vendor in {entityName}.
              Purchase orders cannot be issued until you assign an active
              purchasing site and enable purchasing again.
              {state.relationship.status === "approved"
                ? " The vendor relationship will remain approved."
                : " The vendor relationship status will stay unchanged."}{" "}
              Invoicing, payment settings, and historical transactions will stay
              unchanged. To keep purchasing available, cancel and assign a
              replacement purchasing site first.
            </>
          ) : (
            <>
              This stops new use of {state.assignment.site?.name || "this site"}{" "}
              for {purpose}. It does not rewrite historical transactions.
            </>
          )}
        </DialogDescription>
      </DialogHeader>
      <label
        htmlFor="end-assignment-reason"
        className="block text-[12px] font-semibold text-[#93292e]"
      >
        Reason *
      </label>
      <textarea
        id="end-assignment-reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={4}
        maxLength={2000}
        disabled={submitting}
        placeholder="Why should this site no longer be used for this purpose?"
        className="w-full rounded-[8px] border border-[#fbd5d5] p-3 text-[13px] outline-none placeholder:text-[#a0aaa5] focus:border-[#d33d44]"
      />
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="h-10 rounded-[8px] border border-black/[0.08] px-4 text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting || !reason.trim()}
          onClick={() => void onSubmit(reason, putPurchasingOnHold)}
          className="min-h-10 rounded-[8px] bg-[#d33d44] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#c33339] disabled:opacity-50"
        >
          {submitting
            ? "Saving..."
            : putPurchasingOnHold
              ? "End assignment and put purchasing on hold"
              : "End assignment"}
        </button>
      </DialogFooter>
    </>
  );
}
