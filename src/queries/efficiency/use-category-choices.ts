import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { useEntityWorkspaceStore, workspaceQueryKey } from "@/features/entity-workspace/store";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

export interface CategoryChoice {
  categoryId: string;
  name: string;
  description: string | null;
  policyCount: number;
  policies: { policyId: string; name: string }[];
}
interface Page { data: CategoryChoice[]; meta: { currentPage: number; totalPages: number } }

/** Fetch only the requested search/page; loading another page requires user action. */
export function useCategoryChoices(enabled: boolean, search: string) {
  const client = useAxios();
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  // Subscribe so a mounted picker follows identity/workspace changes immediately.
  useEntityWorkspaceStore(s => s.generation);
  useEntityWorkspaceStore(s => s.identity);
  return useInfiniteQuery({
    queryKey: workspaceQueryKey([...QUERY_KEYS.expenses.categories, "coverage-admin", "choices", debouncedSearch]),
    initialPageParam: 1,
    enabled,
    staleTime: 120_000,
    queryFn: async ({ pageParam, signal }): Promise<Page> => (await client.get("companies/categories/policy-coverage", {
      signal, params: { view: "summary", module: "expense", scope: "all", status: "all", includeCategoriesWithoutPolicies: true, search: debouncedSearch || undefined, page: pageParam, limit: 20 },
    })).data,
    getNextPageParam: last => last.meta.currentPage < last.meta.totalPages ? last.meta.currentPage + 1 : undefined,
  });
}
