import { describe, expect, it } from "vitest";
import {
  canPOApprove,
  canPOAssignVendor,
  canPOSubmit,
  canPOUpdateDraft,
} from "./purchase-order-permissions";

const canFrom = (permissions: string[]) => {
  const set = new Set(permissions);
  return (resource: string, action: string) => set.has(`${resource}.${action}`);
};

describe("purchase order permissions", () => {
  it("requires exact workflow permissions rather than treating create as manage", () => {
    const can = canFrom(["procurement.purchase_order.create"]);
    expect(canPOUpdateDraft(can)).toBe(false);
    expect(canPOSubmit(can)).toBe(false);
    expect(canPOAssignVendor(can)).toBe(false);
  });

  it("uses current backend permission names", () => {
    const can = canFrom([
      "procurement.purchase_order.update_draft",
      "procurement.purchase_order.submit_for_approval",
      "procurement.purchase_order.assign_vendor",
      "procurement.purchase_order.approval_decision",
    ]);
    expect(canPOUpdateDraft(can)).toBe(true);
    expect(canPOSubmit(can)).toBe(true);
    expect(canPOAssignVendor(can)).toBe(true);
    expect(canPOApprove(can)).toBe(true);
  });
});
