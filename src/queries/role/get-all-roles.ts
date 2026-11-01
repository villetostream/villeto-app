import { workspaceQueryKey } from "@/features/entity-workspace/store";
import {
  UseQueryOptions,
  UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import type { Permission } from "@/features/auth/types";
import { AppUser } from "../departments/get-all-departments";

// ── Shared types ───────────────────────────────────────────────────────────

export interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface CapabilityGroupPermission {
  permissionId: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export type CapabilityScopeType =
  | "own"
  | "reporting_chain"
  | "department"
  | "company";
export type CapabilityRiskLevel = "standard" | "elevated" | "sensitive";

export interface RoleCapabilityScopeConfig {
  departmentIds?: string[];
  legalEntityIds?: string[];
}

export interface RoleCapabilityInput {
  key: string;
  scopeType: CapabilityScopeType;
  scopeConfig?: RoleCapabilityScopeConfig;
}

export interface SelectedRoleCapability extends RoleCapabilityInput {
  name: string;
  module: string;
  description?: string;
  riskLevel: CapabilityRiskLevel;
}

export interface ImpliedRoleCapability extends RoleCapabilityInput {
  name: string;
  module: string;
  description?: string;
}

export interface CapabilityGroup {
  capabilityGroupId: string;
  key: string;
  name: string;
  description: string;
  module: string;
  sortOrder: number;
  isActive: boolean;
  supportedScopes?: CapabilityScopeType[];
  defaultScope?: CapabilityScopeType;
  riskLevel?: CapabilityRiskLevel;
  isBaseCapability?: boolean;
  scopePermissions?: Partial<Record<CapabilityScopeType, string[]>>;
  requiredCapabilityKeys?: string[];
  permissions: CapabilityGroupPermission[];
}

export interface CapabilitiesByModule {
  [module: string]: {
    capabilityGroups: CapabilityGroup[];
  };
}

export interface Role {
  roleId: string;
  name: string;
  description?: string;
  isActive: boolean | "Active" | "Inactive";
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
  totalAssignedUsers?: number;
  createdBy?: AppUser;
  templateKey?: string | null;
  source?: string;
  isDefault?: boolean;
  capabilityGroupKeys?: string[];
  capabilitiesByModule?: CapabilitiesByModule;
  selectedCapabilities?: SelectedRoleCapability[];
  impliedCapabilities?: ImpliedRoleCapability[];
  effectivePermissions?: Permission[];
  modules?: string[];
}

export function isRoleActive(role: Pick<Role, "isActive">): boolean {
  return role.isActive === true || role.isActive === "Active";
}

// ── Response shape ─────────────────────────────────────────────────────────

interface PaginatedRolesResponse {
  data: Role[];
  meta: PaginationMeta;
  message: string;
  status: number;
  statusCode: number;
  statusText: string;
}

// ── Params ─────────────────────────────────────────────────────────────────

export interface GetRolesParams {
  page?: number;
  limit?: number;
  view?: "summary" | "lookup" | "count";
  sortBy?:
    | "name"
    | "description"
    | "createdAt"
    | "isActive"
    | "createdBy"
    | "totalAssignedUsers";
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: "Active" | "Inactive";
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated list of all roles.
 * GET /roles?page=1&limit=20
 */
export const useGetAllRolesApi = (
  {
    page = 1,
    limit = 20,
    view = "lookup",
    search,
    status,
    sortBy,
    sortOrder,
  }: GetRolesParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedRolesResponse, Error>,
    "queryKey" | "queryFn"
  >,
): UseQueryResult<PaginatedRolesResponse, Error> => {
  const axiosInstance = useAxios();

  return useQuery<PaginatedRolesResponse, Error>({
    queryKey: workspaceQueryKey([
      ...QUERY_KEYS.people.roles,
      { page, limit, view, search, status, sortBy, sortOrder },
    ]),
    queryFn: async ({ signal }) => {
      const response = await axiosInstance.get(
        API_KEYS.ROLE.ROLES_LIST(page, Math.min(limit, 100)),
        {
          signal,
          params: { view, search, status, sortBy, sortOrder },
        },
      );
      return response.data;
    },
    staleTime: STALE_TIMES.STATIC,
    ...options,
  });
};

/**
 * Fetches a paginated list of company-specific roles.
 * GET /roles?page=1&limit=100&type=company
 *
 * Uses a high limit (100) by default since this list feeds dropdowns —
 * callers that need real pagination can pass explicit page/limit.
 */
export const useGetCompanyRolesApi = (
  {
    page = 1,
    limit = 100,
    view = "lookup",
    search,
    status,
    sortBy,
    sortOrder,
  }: GetRolesParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedRolesResponse, Error>,
    "queryKey" | "queryFn"
  >,
): UseQueryResult<PaginatedRolesResponse, Error> => {
  const axiosInstance = useAxios();

  return useQuery<PaginatedRolesResponse, Error>({
    queryKey: workspaceQueryKey([
      ...QUERY_KEYS.people.roles,
      { page, limit, view, search, status, sortBy, sortOrder },
    ]),
    queryFn: async ({ signal }) => {
      const response = await axiosInstance.get(
        API_KEYS.ROLE.ROLES_COMPANY(page, Math.min(limit, 100)),
        { signal, params: { view, search, status, sortBy, sortOrder } },
      );
      return response.data;
    },
    staleTime: STALE_TIMES.STATIC,
    ...options,
  });
};

/**
 * @deprecated  Use useGetCompanyRolesApi instead.
 * Kept for backward compatibility while callers are migrated.
 */
export const useGetVilletoRolesApi = (
  params: GetRolesParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedRolesResponse, Error>,
    "queryKey" | "queryFn"
  >,
): UseQueryResult<PaginatedRolesResponse, Error> => {
  return useGetCompanyRolesApi(params, options);
};
