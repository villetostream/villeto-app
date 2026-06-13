/**
 * Single source of truth for API response shapes.
 *
 * Every query file that previously declared its own `interface Response { ... }`
 * should import these types instead.
 *
 * Usage:
 *   import { ApiResponse, PaginatedResponse } from '@/shared/types/api';
 *   const { data } = useQuery<ApiResponse<User>>({ ... });
 */

export interface ApiError {
    error: string;
    message?: string;
    success: boolean;
}

/** Pagination metadata returned by list endpoints */
export interface Meta {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
}

/** Base response envelope for all API calls */
export interface ApiResponse<T> {
    data: T;
    message: string;
    status: number;
    statusCode: number;
    statusText: string;
    error?: ApiError;
}

/** Response envelope for paginated list endpoints */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    meta: Meta;
}
