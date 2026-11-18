import { describe, expect, it } from "vitest";
import { prepareManualBillSave } from "./save";

const validBill = {
  financeEntityEligible: true,
  legalEntityId: "entity-1",
  vendorId: "vendor-1",
  vendorSelected: true,
  vendorSiteId: "",
  siteRequired: false,
  invoiceNumber: "INV-100",
  invoiceDate: new Date("2026-11-18T12:00:00"),
  description: "Monthly service",
  currency: "NGN",
  lineItems: [{ description: "Service", quantity: 1, unitPrice: 100 }],
};

describe("manual bill draft preparation", () => {
  it("allows a finance-eligible entity without a company workspace setting", () => {
    const result = prepareManualBillSave(validBill);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.vendorId).toBe("vendor-1");
      expect(result.payload.lineItems).toHaveLength(1);
    }
  });

  it("rejects a selected entity without finance eligibility", () => {
    expect(
      prepareManualBillSave({ ...validBill, financeEntityEligible: false }),
    ).toEqual({
      ok: false,
      message: "Select a legal entity with finance access before saving this bill.",
    });
  });
});
