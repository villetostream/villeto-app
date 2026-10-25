import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
export function vendorManagementQuery(key: QueryKey, identity: string | null) {
  return (
    key[0] === "entity-workspace" &&
    key[1] === identity &&
    [
      "vendor-network",
      "vendors",
      "vendor-management",
      "approved-vendors",
    ].includes(String(key[4]))
  );
}
export function invalidateVendorManagement(client: QueryClient) {
  const identity = useEntityWorkspaceStore.getState().identity;
  return client.invalidateQueries({
    predicate: (query) => vendorManagementQuery(query.queryKey, identity),
  });
}
