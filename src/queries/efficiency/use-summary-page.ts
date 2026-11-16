import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { useAxios } from "@/hooks/useAxios";
import { useEntityWorkspaceStore, workspaceQueryKey } from "@/features/entity-workspace/store";

export function useSummaryPage<T>(url: string, key: readonly unknown[], search: string, filters: Record<string, unknown>, enabled: boolean, defaultSort = "createdAt") {
  const client = useAxios();
  const [settledSearch, setSettledSearch] = useState("");
  useEffect(() => { const timer = setTimeout(() => setSettledSearch(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([{ id: defaultSort, desc: defaultSort !== "name" }]);
  const identity = useEntityWorkspaceStore(s => s.identity);
  const generation = useEntityWorkspaceStore(s => s.generation);
  const selection = useEntityWorkspaceStore(s => s.selection);
  const resetKey = JSON.stringify([identity, generation, selection, filters, settledSearch, pageSize, sorting]);
  const [pageState, setPageState] = useState({ key: resetKey, page: 1 });
  const page = pageState.key === resetKey ? pageState.page : 1;
  if (pageState.key !== resetKey) setPageState({ key: resetKey, page: 1 });
  const sortBy = ["name", "createdAt", "status", "versionNumber"].includes(sorting[0]?.id) ? sorting[0].id : defaultSort;
  const params = { view: "summary", ...filters, page, limit: pageSize, search: settledSearch || undefined, sortBy, sortOrder: sorting[0]?.desc === false ? "asc" : "desc" };
  const query = useQuery<{ data: T[]; meta: {currentPage: number; totalCount: number; totalPages: number; limit: number}; summary: Record<string, number> }>({
    queryKey: workspaceQueryKey([...key, params]), enabled, staleTime: 120_000,
    queryFn: async ({ signal }) => (await client.get(url, { params, signal })).data,
  });
  return { query, sorting, setSorting, paginationProps: { page: query.data?.meta.currentPage ?? page, pageSize, total: query.data?.meta.totalCount ?? 0, setPage: (page: number) => setPageState({ key: resetKey, page }), setPageSize } };
}
