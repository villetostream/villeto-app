import { useEffect, useState } from "react";
import type { SortingState } from "@tanstack/react-table";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { useGetPoliciesApi, type GetPoliciesParams } from "./get-policies";

const sortColumns: Record<string, GetPoliciesParams["sortBy"]> = {
  name: "name", date: "createdAt", createdBy: "createdBy",
  appliedTo: "scopeType", status: "status", archivedOn: "archivedAt",
};

export function usePolicyListPage(search: string, tab: string, enabled: boolean) {
  const [debounced, setDebounced] = useState({ tab, search: "" });
  // A tab change clears search immediately; never send the previous tab's search first.
  const settledSearch = debounced.tab === tab ? debounced.search : search.trim();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced({ tab, search: search.trim() }), 300);
    return () => clearTimeout(timer);
  }, [search, tab]);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const identity = useEntityWorkspaceStore((s) => s.identity);
  const generation = useEntityWorkspaceStore((s) => s.generation);
  const selection = useEntityWorkspaceStore((s) => s.selection);
  const key = JSON.stringify([identity, generation, selection, tab, settledSearch, pageSize, sorting]);
  const [pageState, setPageState] = useState({ key, page: 1 });
  const page = pageState.key === key ? pageState.page : 1;
  if (pageState.key !== key) setPageState({ key, page: 1 });
  const statisticsOnly = tab === "expense";
  const query = useGetPoliciesApi(statisticsOnly ? { view: "statistics" } : {
    view: "summary", collection: tab === "archived" ? "archived" : "current",
    page, limit: pageSize, search: settledSearch || undefined,
    sortBy: sortColumns[sorting[0]?.id] ?? "createdAt",
    sortOrder: sorting[0]?.desc === false ? "asc" : "desc",
  }, { enabled });
  return {
    query, sorting, setSorting,
    paginationProps: {
      page: query.data?.meta?.page ?? page, pageSize,
      total: query.data?.meta?.total ?? 0,
      setPage: (next: number) => setPageState({ key, page: next }),
      setPageSize,
    },
  };
}
