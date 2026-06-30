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
  enforcementAction?: string;
}

export interface PolicyCauseItem {
  categoryName?: string;
  expenseAmount?: number | string;
  violations?: PolicyViolationItem[];
}

export interface PolicyExpenseResult {
  expenseIndex?: number;
  expenseTitle?: string;
  categoryName?: string;
  amount?: number | string;
  violations?: PolicyViolationItem[];
}

function parseViolationItems(items: unknown[]): PolicyViolationItem[] {
  return items.filter(isRecord).map((v) => ({
    type: getOptionalString(v.type),
    message: getOptionalString(v.message) ?? getOptionalString(v.ruleMessage),
    enforcementAction: getOptionalString(v.enforcementAction),
  }));
}

export function isPolicyViolationError(error: unknown): boolean {
  const data = getApiErrorResponseData(error);
  const nested = asRecord(data.data);
  const message = getString(data.message).toLowerCase();

  if (
    getString(data.message) === "Policy Violation Exception" ||
    getString(nested.error) === "Policy Violation" ||
    getString(nested.error) === "PolicyViolation"
  ) {
    return true;
  }

  if (message.includes("policy limit") || message.includes("policy violation")) {
    return true;
  }

  if (Array.isArray(nested.expenseResults) && nested.expenseResults.length > 0) {
    return true;
  }

  if (Array.isArray(nested.violations) && nested.violations.length > 0) {
    return true;
  }

  const causes = nested.cause ?? nested.causes ?? data.cause;
  if (Array.isArray(causes)) {
    return causes.some((c) => isRecord(c) && asArray(c.violations).length > 0);
  }

  return false;
}

/** Per-expense policy results from the backend (422 PolicyViolation payload). */
export function getPolicyExpenseResults(error: unknown): PolicyExpenseResult[] {
  const data = getApiErrorResponseData(error);
  const nested = asRecord(data.data);

  const expenseResults = nested.expenseResults;
  if (Array.isArray(expenseResults) && expenseResults.length > 0) {
    return expenseResults.filter(isRecord).map((r) => ({
      expenseIndex: typeof r.expenseIndex === "number" ? r.expenseIndex : undefined,
      expenseTitle: getOptionalString(r.expenseTitle) ?? getOptionalString(r.title),
      categoryName: getOptionalString(r.categoryName),
      amount:
        typeof r.amount === "number" || typeof r.amount === "string"
          ? r.amount
          : undefined,
      violations: parseViolationItems(asArray(r.violations)),
    }));
  }

  // Legacy cause-based format
  return getPolicyViolationCauses(error).map((cause, index) => ({
    expenseIndex: index,
    categoryName: cause.categoryName,
    amount: cause.expenseAmount,
    violations: cause.violations,
  }));
}

export function getPolicyViolationCauses(error: unknown): PolicyCauseItem[] {
  const data = getApiErrorResponseData(error);
  const nested = asRecord(data.data);
  const causes = nested.cause ?? nested.causes ?? data.cause;
  if (!Array.isArray(causes)) return [];
  return causes.filter(isRecord).map((c) => ({
    categoryName: getOptionalString(c.categoryName) ?? getOptionalString(c.category),
    expenseAmount:
      typeof c.expenseAmount === "number" || typeof c.expenseAmount === "string"
        ? c.expenseAmount
        : typeof c.amount === "number" || typeof c.amount === "string"
          ? c.amount
          : undefined,
    violations: parseViolationItems(asArray(c.violations)),
  }));
}

export interface DuplicateReceiptItem {
  expenseId: string;
  amount: string;
  title: string;
  merchantName: string;
  receiptUrl: string | null;
  fingerprint: string;
  transactionDate: string;
}

export function isDuplicateReceiptError(error: unknown): boolean {
  const message = getApiErrorMessage(error, "").toLowerCase();
  if (message.includes("submitted previously") || message.includes("duplicate receipt")) {
    return true;
  }
  return getDuplicateReceipts(error).length > 0;
}

export function getDuplicateReceipts(error: unknown): DuplicateReceiptItem[] {
  const data = getApiErrorResponseData(error);
  const nested = asRecord(data.data);
  const duplicates = nested.duplicates ?? data.duplicates;
  if (!Array.isArray(duplicates)) return [];
  return duplicates.filter(isRecord).map((d) => ({
    expenseId: getString(d.expenseId),
    amount: getString(d.amount),
    title: getString(d.title),
    merchantName: getString(d.merchantName),
    receiptUrl: typeof d.receiptUrl === "string" ? d.receiptUrl : null,
    fingerprint: getString(d.fingerprint),
    transactionDate: getString(d.transactionDate),
  }));
}

/** Map backend policy results onto expense rows for inline UI indicators. */
export function mapPolicyResultsToExpenses<
  T extends {
    id: string;
    name: string;
    category: string;
    amount: number;
    merchantName?: string;
    policyViolations?: { type: string; message: string; ruleType?: string }[] | null;
  },
>(expenses: T[], results: PolicyExpenseResult[]): T[] {
  if (results.length === 0) return expenses;

  return expenses.map((exp, index) => {
    let matched =
      results.find((r) => r.expenseIndex === index) ??
      results.find(
        (r) =>
          r.expenseTitle &&
          (r.expenseTitle === exp.name ||
            r.expenseTitle === (exp as { title?: string }).title),
      ) ??
      results.find(
        (r) =>
          r.categoryName === exp.category &&
          r.amount !== undefined &&
          Number(r.amount) === Number(exp.amount),
      ) ??
      (results.length === 1 && expenses.length === 1 ? results[0] : undefined);

    if (!matched?.violations?.length) return exp;

    return {
      ...exp,
      policyViolations: matched.violations.map((v) => ({
        type: v.enforcementAction === "block" ? "hard_block" : v.type || "POLICY_RULE",
        message: v.message ?? "Policy violation",
        ruleType: v.type,
      })),
    };
  });
}

/** Apply a policy violation API error onto expense list rows. */
export function applyPolicyViolationErrorToExpenses<
  T extends {
    id: string;
    name: string;
    category: string;
    amount: number;
    merchantName?: string;
    policyViolations?: { type: string; message: string; ruleType?: string }[] | null;
  },
>(expenses: T[], error: unknown): T[] {
  if (!isPolicyViolationError(error)) return expenses;
  return mapPolicyResultsToExpenses(expenses, getPolicyExpenseResults(error));
}

/** Map policy errors onto ManualExpenseForm expense indices. */
export function getPolicyErrorsByExpenseIndex(
  expenseMeta: Array<{ title?: string; category?: string; amount?: number }>,
  error: unknown,
): Record<number, string> {
  if (!isPolicyViolationError(error)) return {};

  const results = getPolicyExpenseResults(error);
  const errors: Record<number, string> = {};

  for (const result of results) {
    const message = (result.violations ?? [])
      .map((v) => v.message)
      .filter(Boolean)
      .join(" ");
    if (!message) continue;

    let index = result.expenseIndex;
    if (index === undefined || index < 0) {
      index = expenseMeta.findIndex((e) => {
        if (result.expenseTitle && e.title === result.expenseTitle) return true;
        return (
          result.categoryName === e.category &&
          result.amount !== undefined &&
          Number(result.amount) === Number(e.amount ?? 0)
        );
      });
    }

    if (index !== undefined && index >= 0) {
      errors[index] = message;
    }
  }

  if (Object.keys(errors).length === 0 && results.length > 0 && expenseMeta.length > 0) {
    const fallback = results[0].violations?.[0]?.message;
    if (fallback) errors[0] = fallback;
  }

  return errors;
}

/** @deprecated Use mapPolicyResultsToExpenses with getPolicyExpenseResults */
export function mapPolicyCausesToExpenses<
  T extends {
    id: string;
    name: string;
    category: string;
    amount: number;
    merchantName?: string;
    policyViolations?: { type: string; message: string; ruleType?: string }[] | null;
  },
>(expenses: T[], causes: PolicyCauseItem[]): T[] {
  const results: PolicyExpenseResult[] = causes.map((cause, index) => ({
    expenseIndex: index,
    categoryName: cause.categoryName,
    amount: cause.expenseAmount,
    violations: cause.violations,
  }));
  return mapPolicyResultsToExpenses(expenses, results);
}

/** Attach duplicate-receipt errors to matching expense rows. */
export function mapDuplicateReceiptsToExpenses<
  T extends {
    id: string;
    name: string;
    amount: number;
    merchantName?: string;
    policyViolations?: { type: string; message: string; ruleType?: string }[] | null;
  },
>(expenses: T[], duplicates: DuplicateReceiptItem[], fallbackMessage: string): T[] {
  if (duplicates.length === 0) return expenses;

  return expenses.map((exp) => {
    const dup =
      duplicates.find(
        (d) =>
          d.merchantName &&
          exp.merchantName &&
          d.merchantName.toLowerCase() === exp.merchantName.toLowerCase() &&
          Number(d.amount) === exp.amount,
      ) ??
      duplicates.find((d) => Number(d.amount) === exp.amount) ??
      (duplicates.length === 1 && expenses.length === 1 ? duplicates[0] : undefined);

    if (!dup) return exp;

    return {
      ...exp,
      policyViolations: [
        {
          type: "hard_block",
          message: `${fallbackMessage} — matches "${dup.title}" (${dup.merchantName}, ${dup.amount}) on ${dup.transactionDate}.`,
          ruleType: "duplicate_receipt",
        },
      ],
    };
  });
}
