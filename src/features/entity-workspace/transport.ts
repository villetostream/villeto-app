const ENTITY_ROUTES =
  /^(?:procurement\/|bill-pay\/|accounting\/|reports\/accounting-ownership|reports\/[^/]+\/accounting-ownership|expenses\/[^/]+\/allocations|users\/directory|vendor-network\/(?:vendors(?:\/[^/]+)?\/?$|vendor\/company\/[^/]+\/documents)|events\/notifications|legal-entities\/[^/]+\/eligible-vendors)/;

function normalizeRoute(url: string): string {
  const withoutOrigin = url.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\/[^/?#]+/, "");
  return withoutOrigin.split("?")[0].replace(/^\/+/, "");
}

export function workspaceRoute(url: string, method = "GET"): boolean {
  const route = normalizeRoute(url);
  const reading = ["GET", "HEAD"].includes(method.toUpperCase());
  if (route === "bill-pay/mailbox-connections/google/callback") return false;
  // People list (directory, invited/uninvited users and their stat counts).
  if (/^users\/?$/.test(route)) return reading;
  if (route === "policy" || route.startsWith("policy/")) {
    if (route.startsWith("policy/approval-settings")) return false;
    if (route.startsWith("policy/procurement/spend-programs")) {
      if (
        route.startsWith("policy/procurement/spend-programs/settings") ||
        route.startsWith("policy/procurement/spend-programs/rule-definitions") ||
        route.startsWith("policy/procurement/spend-programs/eligible-approval-roles")
      ) {
        return false;
      }
      return true;
    }
    if (route.startsWith("policy/procurement")) {
      return (
        reading &&
        /^policy\/procurement(?:\/drafts)?(?:\/[^/]+)?\/?$/.test(route)
      );
    }
    return (
      route === "policy" ||
      route.startsWith("policy/drafts") ||
      /^policy\/[^/]+(?:\/(?:approve|reject))?\/?$/.test(route)
    );
  }
  if (route.startsWith("vendors")) {
    if (/^vendors(?:\/directory)?\/?$/.test(route)) return reading;
    const match = /^vendors\/([^/]+)(\/.*)?$/.exec(route);
    if (
      !match ||
      ["me", "auth", "onboarding", "invitations"].includes(match[1])
    )
      return false;
    const tail = match[2] || "";
    return (
      tail.startsWith("/entity-relationships") ||
      (reading && (!tail || tail.startsWith("/documents/")))
    );
  }
  return ENTITY_ROUTES.test(route);
}
export function workspaceDetailRoute(url: string): boolean {
  return /^(?:procurement\/(?:purchase-requests|purchase-orders|invoices)|bill-pay\/(?:invoices|intakes|payments|payment-requests|bank-transactions)|accounting\/(?:journals|obligations)|reports)\/[^/?]+\/?$/.test(
    normalizeRoute(url),
  );
}
export function reportReviewRoute(
  url: string,
  params?: Record<string, unknown>,
): boolean {
  const withoutOrigin = url.replace(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\/[^/?#]+/, "");
  const [route, search = ""] = withoutOrigin.replace(/^\/+/, "").split("?");
  const scope = params?.scope || new URLSearchParams(search).get("scope");
  return (
    route === "companies/expense/reports" ||
    /^reports\/[^/]+\/(approve|reject)$/.test(route) ||
    (route === "reports" && !!scope && scope !== "own")
  );
}
export function stripAllEntityFilter(url: string): string {
  const index = url.indexOf("?");
  if (index < 0) return url;
  const params = new URLSearchParams(url.slice(index + 1));
  if (params.get("legalEntityId") === "all") params.delete("legalEntityId");
  const search = params.toString();
  return url.slice(0, index) + (search ? `?${search}` : "");
}
export function responseEntity(
  payload: unknown,
  actorId?: string,
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const object = payload as Record<string, unknown>;
  if (typeof object.legalEntityId === "string") return object.legalEntityId;
  if (
    actorId &&
    typeof object.reporterId === "string" &&
    object.reporterId !== actorId &&
    object.reimbursementEntity &&
    typeof object.reimbursementEntity === "object"
  ) {
    return responseEntity(object.reimbursementEntity, actorId);
  }
  if (object.legalEntity && typeof object.legalEntity === "object") {
    const id = (object.legalEntity as Record<string, unknown>).legalEntityId;
    if (typeof id === "string") return id;
  }
  return (
    responseEntity(object.data, actorId) ||
    responseEntity(object.paymentRequest, actorId)
  );
}

/** Expense detail reads carry context for reviewers, but owner history remains
 * available without a primary assignment. The server resolves actor ownership. */
export function optionalWorkspaceDetail(url: string, method = "GET"): boolean {
  return (
    ["GET", "HEAD"].includes(method.toUpperCase()) &&
    /^\/?reports\/[^/?]+\/?$/.test(normalizeRoute(url))
  );
}
