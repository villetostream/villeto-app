import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useQueryClient } from "@tanstack/react-query";

export const unwrap = <T>(value: { data?: T } | T): T =>
  value && typeof value === "object" && "data" in value
    ? (value as { data: T }).data
    : (value as T);

export function invalidateInvoiceLists(
  client: ReturnType<typeof useQueryClient>,
) {
  void client.invalidateQueries({
    queryKey: workspaceQueryKey(["bill-pay", "invoices"]),
  });
  void client.invalidateQueries({
    queryKey: workspaceQueryKey(["procurement-invoices"]),
  });
}
