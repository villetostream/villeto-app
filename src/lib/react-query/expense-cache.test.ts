import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { invalidateAllExpenseQueries } from "./expense-cache";

afterEach(() => useEntityWorkspaceStore.getState().reset(null));

describe("expense review cache refresh", () => {
  it("invalidates personal and reviewer views across the current actor's entities only", async () => {
    const client = new QueryClient();
    useEntityWorkspaceStore.getState().reset("company:user");
    const affected = [
      ["entity-workspace", "company:user", "A", 1, "expenses", "reports", "own"],
      ["entity-workspace", "company:user", "B", 2, "expenses", "company-reports"],
      ["entity-workspace", "company:user", "all", 3, "expenses", "drafts"],
      ["entity-workspace", "company:user", "legacy", 0, "expenses", "reports", "id"],
      ["expenses", "reports", "own"],
    ];
    const unaffected = [
      ["entity-workspace", "other-company:user", "A", 1, "expenses", "reports"],
      ["entity-workspace", "company:other-user", "A", 1, "expenses", "reports"],
      ["entity-workspace", "company:user", "A", 1, "bill-pay"],
    ];
    for (const key of [...affected, ...unaffected]) client.setQueryData(key, []);
    await invalidateAllExpenseQueries(client);
    for (const key of affected) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    for (const key of unaffected) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
    client.clear();
  });
});
