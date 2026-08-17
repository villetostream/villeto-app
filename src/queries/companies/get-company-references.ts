import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";

export interface JobGrade {
  jobGradeId: string;
  code: string;
  name: string | null;
  rank: number | null;
  isActive: boolean;
}

export interface ManagementLevel {
  managementLevelId: string;
  code: string;
  name: string;
  rank: number | null;
  isActive: boolean;
}

interface ReferenceResponse {
  message: string;
  status: number;
  data: {
    jobGrades: JobGrade[];
    managementLevels: ManagementLevel[];
    managers: unknown[];
  };
}

export const useGetJobGradesApi = (
  options?: Omit<UseQueryOptions<ReferenceResponse, Error>, "queryKey" | "queryFn">
): UseQueryResult<ReferenceResponse, Error> => {
  const axiosInstance = useAxios();

  return useQuery<ReferenceResponse, Error>({
    queryKey: ["companies", "job-grades"],
    queryFn: async () => {
      const response = await axiosInstance.get(API_KEYS.COMPANY.IMPORT_REFERENCES("job_grades"));
      return response.data;
    },
    staleTime: STALE_TIMES.SLOW,
    ...options,
  });
};

export const useGetManagementLevelsApi = (
  options?: Omit<UseQueryOptions<ReferenceResponse, Error>, "queryKey" | "queryFn">
): UseQueryResult<ReferenceResponse, Error> => {
  const axiosInstance = useAxios();

  return useQuery<ReferenceResponse, Error>({
    queryKey: ["companies", "management-levels"],
    queryFn: async () => {
      const response = await axiosInstance.get(API_KEYS.COMPANY.IMPORT_REFERENCES("management_levels"));
      return response.data;
    },
    staleTime: STALE_TIMES.SLOW,
    ...options,
  });
};
