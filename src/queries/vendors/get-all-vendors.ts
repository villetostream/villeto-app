import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
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
  options?: Omit<UseQueryOptions<ApiResponse<Vendor[]>, Error>, "queryKey" | "queryFn">
): UseQueryResult<ApiResponse<Vendor[]>, Error> => {
  const axiosInstance = useAxios();
  
  return useQuery({
    queryKey: ["vendors", params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.page) query.set("page", params.page.toString());
      if (params.limit) query.set("limit", params.limit.toString());
      if (params.approvalStatus) query.set("approvalStatus", params.approvalStatus);
      
      const url = `/vendors${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await axiosInstance.get(url);
      return res.data;
    },
    staleTime: STALE_TIMES.SLOW,
    ...options,
  });
};
