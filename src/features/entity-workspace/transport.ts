const ENTITY_ROUTES = /^(?:procurement\/|bill-pay\/|accounting\/|reports\/accounting-ownership|reports\/[^/]+\/accounting-ownership|expenses\/[^/]+\/allocations|users\/directory|vendors(?:\/directory|\/[^/]+(?:\/entity-relationships|\/documents)?|$)|events\/notifications|legal-entities\/[^/]+\/eligible-vendors|policy\/procurement)/;

export function workspaceRoute(url: string): boolean {
  return ENTITY_ROUTES.test(url.split("?")[0].replace(/^\/+/, ""));
}
export function workspaceDetailRoute(url: string): boolean {
  return /^(?:procurement\/(?:purchase-requests|purchase-orders|invoices)|bill-pay\/(?:invoices|intakes|payments|payment-requests))\/[^/?]+\/?$/.test(url.split("?")[0].replace(/^\/+/, ""));
}
export function reportReviewRoute(url: string, params?: Record<string, unknown>): boolean {
  const [route, search = ""] = url.replace(/^\/+/, "").split("?");
  const scope = params?.scope || new URLSearchParams(search).get("scope");
  return route === "companies/expense/reports" || /^reports\/[^/]+\/(approve|reject)$/.test(route) || route === "reports" && !!scope && scope !== "own";
}
export function stripAllEntityFilter(url: string): string {
  const index = url.indexOf("?");
  if (index < 0) return url;
  const params = new URLSearchParams(url.slice(index + 1));
  if (params.get("legalEntityId") === "all") params.delete("legalEntityId");
  const search = params.toString();
  return url.slice(0, index) + (search ? `?${search}` : "");
}
export function responseEntity(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const object = payload as Record<string, unknown>;
  if (object.legalEntity && typeof object.legalEntity === "object") {
    const id = (object.legalEntity as Record<string, unknown>).legalEntityId;
    if (typeof id === "string") return id;
  }
  return responseEntity(object.data) || responseEntity(object.paymentRequest);
}
