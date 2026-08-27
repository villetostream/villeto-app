export interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface PaginatedList<T> {
  items: T[];
  meta?: PaginationMeta;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isPaginationMeta = (value: unknown): value is PaginationMeta =>
  isRecord(value) &&
  typeof value.totalCount === "number" &&
  typeof value.totalPages === "number" &&
  typeof value.currentPage === "number" &&
  typeof value.limit === "number";

/**
 * Normalizes both the API response envelope and its paginated payload:
 * `{ message, status, data: { data: T[], meta } }`.
 *
 * Raw arrays and the legacy `{ data: T[] }` shape remain supported while
 * clients migrate to paginated endpoints.
 */
export function unwrapPaginatedList<T>(response: unknown): PaginatedList<T> {
  let payload = response;

  if (
    isRecord(payload) &&
    isRecord(payload.data) &&
    Array.isArray(payload.data.data)
  ) {
    payload = payload.data;
  }

  if (Array.isArray(payload)) {
    return { items: payload as T[] };
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return {
      items: payload.data as T[],
      meta: isPaginationMeta(payload.meta) ? payload.meta : undefined,
    };
  }

  throw new TypeError("Expected a paginated list response");
}
