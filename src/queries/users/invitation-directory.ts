import type { AxiosInstance } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { API_KEYS } from "@/lib/constants/apis";
import type { UserListParams } from "./get-all-users";

/** Explicit user actions may need all matches, but only small projections. */
export async function fetchInvitationOptions<T>(
  axios: AxiosInstance,
  params: UserListParams & { view: "ids" | "departments" },
  signal: AbortSignal,
): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    signal.throwIfAborted();
    const response = await axios.get<{ data: T[]; meta: { totalPages: number } }>(API_KEYS.USER.USERS, {
      params: { ...params, page, limit: 100 }, signal,
    });
    signal.throwIfAborted();
    rows.push(...response.data.data);
    totalPages = response.data.meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  return rows;
}

export function useInvitationDepartments(enabled: boolean) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([...QUERY_KEYS.people.users(), "invitation-departments"]),
    queryFn: ({ signal }) => fetchInvitationOptions<{ departmentId: string; name: string }>(
      axios, { status: "all", view: "departments" }, signal,
    ),
    enabled,
    staleTime: STALE_TIMES.NORMAL,
  });
}
