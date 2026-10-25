import { describe, expect, it } from "vitest";
import { changedRelationshipControls, controlsDraft } from "./relationship-controls";

describe("relationship control patches", () => {
  it("edits suspended relationship terms without resubmitting existing enabled purposes", () => {
    const stored = { purchasingEnabled: true, invoicingEnabled: true, paymentEnabled: true, paymentTermsDays: 30 };
    expect(changedRelationshipControls(stored, { ...controlsDraft(stored), paymentTermsDays: 45 })).toEqual({ paymentTermsDays: 45 });
  });
  it("sends an explicit null when clearing tax or terms and preserves intentional purpose changes", () => {
    const stored = { taxCountryCode: "NG", paymentTermsCode: "NET30", purchasingEnabled: true };
    expect(changedRelationshipControls(stored, { ...controlsDraft(stored), taxCountryCode: "", paymentTermsCode: "", purchasingEnabled: false })).toEqual({ taxCountryCode: null, paymentTermsCode: null, purchasingEnabled: false });
  });
  it("does not submit unchanged controls", () => {
    expect(changedRelationshipControls(null, controlsDraft(null))).toEqual({});
  });
});
