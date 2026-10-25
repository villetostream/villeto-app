import { workspaceQueryKey } from "@/features/entity-workspace/store";
import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { Vendor } from "@/queries/procurement/purchase-requests";

interface ApiResponse<T> {
  data: T;
  meta?: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message: string;
  status: number;
  statusCode: number;
  success: boolean;
}

export interface GetVendorsParams {
  page?: number;
  limit?: number;
  approvalStatus?: string;
}

export const useGetAllVendors = (
  params: GetVendorsParams = {},
  options?: Omit<
    UseQueryOptions<ApiResponse<Vendor[]>, Error>,
    "queryKey" | "queryFn"
  >,
): UseQueryResult<ApiResponse<Vendor[]>, Error> => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(["vendors", params]),
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.page) query.set("page", params.page.toString());
      if (params.limit) query.set("limit", params.limit.toString());
      if (params.approvalStatus)
        query.set("approvalStatus", params.approvalStatus);

      const url = `/vendor-network/vendors${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await axiosInstance.get(url);
      const body = res.data;
      const rawList = Array.isArray(body?.data?.data)
        ? body.data.data
        : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body)
        ? body
        : [];
      const meta = body?.data?.meta ?? body?.meta;
      return {
        ...body,
        data: rawList,
        meta,
      };
    },
    staleTime: STALE_TIMES.SLOW,
    ...options,
  });
};
