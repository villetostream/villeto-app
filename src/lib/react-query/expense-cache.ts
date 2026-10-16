import type { QueryClient } from "@tanstack/react-query";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";

/** Refresh expense views across this actor's workspaces after a review action. */
export function invalidateAllExpenseQueries(queryClient: QueryClient) {
  const identity = useEntityWorkspaceStore.getState().identity;
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === "expenses" ||
      (queryKey[0] === "entity-workspace" &&
        queryKey[1] === identity &&
        queryKey[4] === "expenses"),
  });
}
