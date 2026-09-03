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

export interface PolicyLimitCheck {
  timeUnit?: string;
  limit?: number;
  spentBeforeThisReport?: number;
  thisReportAmount?: number;
  totalAfterThisReport?: number;
  exceeded?: boolean;
  overage?: number;
}

export interface PolicyViolationItem {
  type?: string;
  message?: string;
  enforcementAction?: string;
  actionText?: string;
  limitChecks?: PolicyLimitCheck[];
  categoryName?: string;
  requiredFields?: string[];
}

export interface PolicyCauseItem {
  categoryName?: string;
  expenseAmount?: number | string;
  violations?: PolicyViolationItem[];
}

export interface PolicyExpenseResult {
  expenseIndex?: number;
  expenseTitle?: string;
  categoryId?: string;
  categoryName?: string;
  amount?: number | string;
  violations?: PolicyViolationItem[];
}

function parseViolationItems(items: unknown[], expenseAmount?: number): PolicyViolationItem[] {
  return items.filter(isRecord).map((v) => {
    let limitChecks = Array.isArray(v.limitChecks)
      ? v.limitChecks.filter(isRecord).map((lc) => ({
          timeUnit: getOptionalString(lc.timeUnit),
          limit: getNumber(lc.limit),
          spentBeforeThisReport: getNumber(lc.spentBeforeThisReport),
          thisReportAmount: getNumber(lc.thisReportAmount),
          totalAfterThisReport: getNumber(lc.totalAfterThisReport),
          exceeded: getBoolean(lc.exceeded),
          overage: getNumber(lc.overage),
        }))
      : undefined;

    const type = getOptionalString(v.type);
    const message = getOptionalString(v.message) ?? getOptionalString(v.ruleMessage);

    // Parse limits from message if backend didn't provide limitChecks for SPEND_LIMIT
    if (type === "SPEND_LIMIT" && (!limitChecks || limitChecks.length === 0) && message) {
      const match = message.match(/over the (daily|monthly|weekly) .* limit by [A-Z$€£]+\s*([\d,\.]+)\. Limit: [A-Z$€£]+\s*([\d,\.]+)\. Total after this submission: [A-Z$€£]+\s*([\d,\.]+)\./i);
      if (match) {
        const timeUnit = match[1].toLowerCase();
        const overage = parseFloat(match[2].replace(/,/g, ""));
        const limit = parseFloat(match[3].replace(/,/g, ""));
        const totalAfterThisReport = parseFloat(match[4].replace(/,/g, ""));
        
        const thisReportAmount = expenseAmount || 0;
        const spentBeforeThisReport = Math.max(0, totalAfterThisReport - thisReportAmount);
        
        limitChecks = [{
          timeUnit,
          limit,
          totalAfterThisReport,
          overage,
          thisReportAmount,
          spentBeforeThisReport,
          exceeded: true,
        }];
      }
    }

    return {
      type,
      message,
      enforcementAction: getOptionalString(v.enforcementAction) ?? (getOptionalString(v.actionStatus)?.toLowerCase() === "block" ? "block" : getOptionalString(v.actionStatus)?.toLowerCase() === "action_required" ? "soft_warn" : undefined),
      actionText: getOptionalString(v.actionText),
      limitChecks,
      categoryName: getOptionalString(v.categoryName),
      requiredFields: asArray(v.requiredFields).map((f) => getString(f)),
    };
  });
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

  // New backend shape: resolution = "BLOCK" or "ACTION_REQUIRED" with top-level violations[] or expenses[]
  const resolution = getString(nested.resolution).toUpperCase();
  if (resolution === "BLOCK" || resolution === "ACTION_REQUIRED") {
    return true;
  }

  if (message.includes("policy limit") || message.includes("policy violation") || message.includes("report blocked")) {
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

  const expenseResults = nested.expenseResults ?? nested.expenses;
  if (Array.isArray(expenseResults) && expenseResults.length > 0) {
    // Parse each expense result
    const parsed: PolicyExpenseResult[] = expenseResults.filter(isRecord).map((r) => ({
      expenseIndex: typeof r.expenseIndex === "number" ? r.expenseIndex : undefined,
      expenseTitle: getOptionalString(r.expenseTitle) ?? getOptionalString(r.title),
      categoryId: getOptionalString(r.categoryId),
      categoryName: getOptionalString(r.categoryName),
      amount:
        typeof r.amount === "number" || typeof r.amount === "string"
          ? r.amount
          : undefined,
      violations: parseViolationItems(asArray(r.violations ?? r.issues), typeof r.amount === "number" ? r.amount : Number(r.amount)),
    }));

    // NEW backend shape: top-level violations[] carry full details (message, limitChecks, etc.)
    // while per-expense violations[] is often empty. The backend tells us which violations
    // belong to which expense via TWO mechanisms:
    //   1. policyViolationRefs[] on each expenseResult (most reliable — direct mapping)
    //   2. affectedExpenseIndexes[] on each top-level violation
    // For violations not referenced by either, we fall back to categoryId matching.
    const topLevelViolations = asArray(nested.violations).filter(isRecord);
    if (topLevelViolations.length > 0) {
      const hasMissingPerExpenseViolations = parsed.some((r) => !r.violations || r.violations.length === 0);
      if (hasMissingPerExpenseViolations) {
        // Build a detailed violation item from each top-level violation, keyed by type+policyId
        const violationDetails = new Map<string, { item: PolicyViolationItem; raw: Record<string, unknown> }>();
        topLevelViolations.forEach((v) => {
          const vType = getOptionalString(v.type) ?? "";
          const vPolicyId = getOptionalString(v.policyId) ?? "";
          const key = `${vType}::${vPolicyId}`;
          const violationItem: PolicyViolationItem = {
            type: getOptionalString(v.type),
            message: getOptionalString(v.message),
            enforcementAction: getOptionalString(v.enforcementAction),
            limitChecks: Array.isArray(v.limitChecks)
              ? v.limitChecks.filter(isRecord).map((lc) => ({
                  timeUnit: getOptionalString(lc.timeUnit),
                  limit: getNumber(lc.limit),
                  spentBeforeThisReport: getNumber(lc.spentBeforeThisReport),
                  thisReportAmount: getNumber(lc.thisReportAmount),
                  totalAfterThisReport: getNumber(lc.totalAfterThisReport),
                  exceeded: getBoolean(lc.exceeded),
                  overage: getNumber(lc.overage),
                }))
              : undefined,
            categoryName: getOptionalString(v.categoryName),
          };
          violationDetails.set(key, { item: violationItem, raw: v });
        });

        // Step 1: Use policyViolationRefs from each expense result as primary mapping
        const byIndex: Record<number, PolicyViolationItem[]> = {};
        const matchedKeys = new Set<string>();

        expenseResults.filter(isRecord).forEach((r) => {
          const idx = typeof r.expenseIndex === "number" ? r.expenseIndex : -1;
          if (idx < 0) return;
          const refs = asArray(r.policyViolationRefs).filter(isRecord);
          refs.forEach((ref) => {
            const refType = getOptionalString(ref.type) ?? "";
            const refPolicyId = getOptionalString(ref.policyId) ?? "";
            const key = `${refType}::${refPolicyId}`;
            const detail = violationDetails.get(key);
            if (detail) {
              if (!byIndex[idx]) byIndex[idx] = [];
              byIndex[idx].push(detail.item);
              matchedKeys.add(key);
            }
          });
        });

        // Step 2: For top-level violations NOT matched by any policyViolationRef,
        // use affectedExpenseIndexes, then categoryId matching as fallback
        violationDetails.forEach(({ item, raw }, key) => {
          if (matchedKeys.has(key)) return; // already mapped via policyViolationRefs

          const affectedIndexes = asArray(raw.affectedExpenseIndexes).filter(
            (i): i is number => typeof i === "number"
          );

          let targets = affectedIndexes;
          if (targets.length === 0) {
            // Fallback: match by categoryId if the violation specifies one
            const vCategoryId = getOptionalString(raw.categoryId);
            if (vCategoryId) {
              targets = parsed.filter(r => r.categoryId === vCategoryId).map(r => r.expenseIndex ?? 0);
            }
            // If still empty, apply to all
            if (targets.length === 0) {
              targets = parsed.map(r => r.expenseIndex ?? 0);
            }
            if (targets.length === 0) targets = [0];
          }

          targets.forEach((idx) => {
            if (!byIndex[idx]) byIndex[idx] = [];
            byIndex[idx].push(item);
          });
        });

        // Merge into parsed results
        return parsed.map((r) => {
          const idx = r.expenseIndex;
          const extra = idx !== undefined ? byIndex[idx] ?? [] : [];
          return {
            ...r,
            violations: [...(r.violations ?? []), ...extra],
          };
        });
      }
    }

    return parsed;
  }

  // Standalone top-level violations[] without expenseResults (edge case)
  const topLevelOnly = asArray(nested.violations).filter(isRecord);
  if (topLevelOnly.length > 0) {
    // Create one synthetic result per unique affectedExpenseIndex
    const byIndex: Record<number, PolicyViolationItem[]> = {};
    topLevelOnly.forEach((v) => {
      const affectedIndexes = asArray(v.affectedExpenseIndexes).filter(
        (i): i is number => typeof i === "number"
      );
      const violationItem: PolicyViolationItem = {
        type: getOptionalString(v.type),
        message: getOptionalString(v.message),
        enforcementAction: getOptionalString(v.enforcementAction),
        limitChecks: Array.isArray(v.limitChecks)
          ? v.limitChecks.filter(isRecord).map((lc) => ({
              timeUnit: getOptionalString(lc.timeUnit),
              limit: getNumber(lc.limit),
              spentBeforeThisReport: getNumber(lc.spentBeforeThisReport),
              thisReportAmount: getNumber(lc.thisReportAmount),
              totalAfterThisReport: getNumber(lc.totalAfterThisReport),
              exceeded: getBoolean(lc.exceeded),
              overage: getNumber(lc.overage),
            }))
          : undefined,
      };
      const targets = affectedIndexes.length > 0 ? affectedIndexes : [0];
      targets.forEach((idx) => {
        if (!byIndex[idx]) byIndex[idx] = [];
        byIndex[idx].push(violationItem);
      });
    });
    return Object.entries(byIndex).map(([idx, violations]) => ({
      expenseIndex: Number(idx),
      violations,
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
    violations: parseViolationItems(
      asArray(c.violations),
      typeof c.expenseAmount === "number" ? c.expenseAmount : Number(c.expenseAmount) || (typeof c.amount === "number" ? c.amount : Number(c.amount))
    ),
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



/** Map procurement policy violations onto PR line items for inline UI indicators. */
export function applyProcurementPolicyErrorToLineItems<
  T extends {
    purchaseRequestLineItemId?: string;
    categoryName?: string;
    subtotal?: number;
    lineTotal?: number;
    quantity?: number;
    unitPrice?: number;
    policyViolations?: { type: string; message: string; ruleType?: string }[] | null;
  }
>(lineItems: T[], violations: ProcurementPolicyViolation[] | null): T[] {
  if (!violations || violations.length === 0) return lineItems;

  return lineItems.map((item) => {
    const itemTotal = item.lineTotal ?? item.subtotal ?? ((item.quantity || 0) * (item.unitPrice || 0));

    const matchedViolations = violations.filter(v => {
      // If rule is amount-related, match against actualAmount
      if (v.details?.actualAmount && (v.rule.includes("total") || v.rule.includes("amount"))) {
        return Number(v.details.actualAmount) === Number(itemTotal);
      }
      // If rule is category-related, match against categoryName
      if (v.rule.includes("category") && v.details?.categoryName) {
        return v.details.categoryName === item.categoryName;
      }
      return false;
    });

    if (matchedViolations.length === 0) return item;

    return {
      ...item,
      policyViolations: matchedViolations.map(v => ({
        type: v.resolution === "BLOCK" ? "hard_block" : "soft_warning",
        message: v.message,
        ruleType: v.rule,
      }))
    };
  });
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
      policyViolations: matched.violations.map((v) => {
        const isHard = v.enforcementAction === "block";
        return {
          type: isHard ? "hard_block" : "soft_warning",
          message: v.message || "Policy violation",
          ruleType: v.type,
          limitChecks: v.limitChecks,
          actionText: v.actionText,
          requiredFields: v.requiredFields,
        };
      }),
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

/* ─── Procurement Policy Violations ─────────────────────────────────────── */

export interface ProcurementPolicyViolation {
  policyId: string;
  policyName: string;
  policyGroup: string;
  rule: string;
  enforcementAction: string;
  resolution: string;
  message: string;
  details?: Record<string, any>;
}

export function isProcurementPolicyViolationError(error: unknown): boolean {
  const data = getApiErrorResponseData(error);
  const nested = asRecord(data.data);
  const errorMsg = getString(nested.error) || getString(data.error);
  const message = (getString(nested.message) || getString(data.message)).toLowerCase();
  
  if (errorMsg === "ProcurementPolicyViolation" || errorMsg === "PolicyViolation") {
    return true;
  }
  
  if (message.includes("procurement action blocked") || message.includes("policy limit")) {
    return true;
  }
  
  return false;
}

export function getProcurementPolicyViolations(error: unknown): ProcurementPolicyViolation[] {
  if (!isProcurementPolicyViolationError(error)) return [];
  const data = getApiErrorResponseData(error);
  const nested = asRecord(data.data);
  
  const target = Array.isArray(nested.violations) || Array.isArray(nested.requiredActions) ? nested : data;

  const allItems = [
    ...asArray(target.violations),
    ...asArray(target.requiredActions),
  ];

  return allItems.filter(isRecord).map(v => ({
    policyId: getString(v.policyId),
    policyName: getString(v.policyName),
    policyGroup: getString(v.policyGroup),
    rule: getString(v.rule),
    enforcementAction: getString(v.enforcementAction),
    resolution: getString(v.resolution),
    message: getString(v.message),
    details: asRecord(v.details),
  }));
}
