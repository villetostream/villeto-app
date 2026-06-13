export type ApiError = {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (!isRecord(error)) return fallback;
  const apiError = error as ApiError;
  const data = apiError.response?.data;
  const dataMessage = isRecord(data)
    ? getOptionalString(data.message) ?? getOptionalString(data.error)
    : undefined;
  return dataMessage ?? getOptionalString(apiError.message) ?? fallback;
}

export function getApiErrorResponseData(error: unknown): Record<string, unknown> {
  if (!isRecord(error)) return {};
  const response = (error as ApiError).response;
  if (!isRecord(response)) return {};
  return asRecord(response.data);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function getOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function getBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function getNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function pickString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = record[key];
    if (typeof val === "string") return val;
  }
  return "";
}

export function pickOptionalString(
  record: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const val = record[key];
    if (typeof val === "string") return val;
  }
  return undefined;
}

export interface PolicyViolationItem {
  type?: string;
  message?: string;
}

export interface PolicyCauseItem {
  categoryName?: string;
  expenseAmount?: number | string;
  violations?: PolicyViolationItem[];
}

export function isPolicyViolationError(error: unknown): boolean {
  const data = getApiErrorResponseData(error);
  const nested = asRecord(data.data);
  return (
    getString(data.message) === "Policy Violation Exception" ||
    getString(nested.error) === "Policy Violation"
  );
}

export function getPolicyViolationCauses(error: unknown): PolicyCauseItem[] {
  const data = getApiErrorResponseData(error);
  const nested = asRecord(data.data);
  const causes = nested.cause;
  if (!Array.isArray(causes)) return [];
  return causes.filter(isRecord).map((c) => ({
    categoryName: getOptionalString(c.categoryName),
    expenseAmount:
      typeof c.expenseAmount === "number" || typeof c.expenseAmount === "string"
        ? c.expenseAmount
        : undefined,
    violations: asArray(c.violations)
      .filter(isRecord)
      .map((v) => ({
        type: getOptionalString(v.type),
        message: getOptionalString(v.message),
      })),
  }));
}
