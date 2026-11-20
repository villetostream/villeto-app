"use client";

export function formatNgn(amount: number | string | null | undefined): string {
  if (amount == null || amount === "") return "—";
  const num = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(num);
}

export function mapDemoBadgeStatus(raw: string): {
  status: string;
  label: string;
} {
  const normalized = raw.toUpperCase();
  switch (normalized) {
    case "APPROVED":
    case "ACTIVE":
    case "MATCHED":
    case "COMPLETED":
    case "RECONCILED":
    case "CLEARED":
    case "COMPLIANT":
    case "POSTED":
    case "SYNCED_TO_ERP":
    case "PAID":
      return {
        status: "approved",
        label: raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      };
    case "PENDING_APPROVAL":
    case "PENDING":
    case "PARTIALLY_PAID":
    case "AWAITING_CONFIRMATION":
    case "AWAITING_RELEASE":
    case "AWAITING_INVOICE":
    case "FLAGGED":
    case "PRICE_CHANGED":
      return {
        status: "pending",
        label: raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      };
    case "EXCEPTION_HOLD":
    case "VARIANCE_HOLD":
    case "VIOLATION":
    case "FAILED":
    case "FAILED_RENEWAL":
    case "REJECTED":
    case "FROZEN":
      return {
        status: "rejected",
        label: raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      };
    case "UPCOMING":
    case "SCHEDULED":
    case "PROCESSING":
      return {
        status: "issued",
        label: raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      };
    default:
      return {
        status: "draft",
        label: raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      };
  }
}
