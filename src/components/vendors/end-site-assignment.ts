export interface EndingSiteAssignment {
  vendorEntitySiteAssignmentId: string;
  purpose: "purchasing" | "invoicing" | "remit_to";
  status: "active" | "inactive";
  effectiveFrom: string | null;
  effectiveTo: string | null;
  site: { status: "active" | "inactive"; name: string } | null;
}

export interface EndingRelationship {
  purchasingEnabled: boolean;
  status: "pending" | "approved" | "suspended";
  legalEntity: { displayName: string | null; legalName: string } | null;
  siteAssignments: EndingSiteAssignment[];
}

export function requiresPurchasingHold(
  relationship: EndingRelationship,
  assignment: EndingSiteAssignment,
  now = Date.now(),
) {
  return (
    assignment.status === "active" &&
    assignment.purpose === "purchasing" &&
    relationship.purchasingEnabled &&
    !relationship.siteAssignments.some(
      (other) =>
        other.vendorEntitySiteAssignmentId !==
          assignment.vendorEntitySiteAssignmentId &&
        other.purpose === "purchasing" &&
        other.status === "active" &&
        other.site?.status === "active" &&
        (!other.effectiveFrom ||
          new Date(other.effectiveFrom).getTime() <= now) &&
        (!other.effectiveTo || new Date(other.effectiveTo).getTime() > now),
    )
  );
}

export function shouldRefreshAfterEndConflict(
  body: unknown,
  purpose: EndingSiteAssignment["purpose"],
) {
  if (!body || typeof body !== "object") return false;
  const error = body as { code?: unknown; data?: { code?: unknown } | null };
  const code = error.code ?? error.data?.code;
  return (
    code === "VENDOR_ENTITY_RELATIONSHIP_VERSION_CONFLICT" ||
    code === "VENDOR_SITE_ASSIGNMENT_CHANGED" ||
    (code === "VENDOR_SITE_ASSIGNMENT_REQUIRED" && purpose === "purchasing")
  );
}
