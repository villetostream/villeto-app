/**
 * Persistent store for policy & spend program rejection reasons and rejector metadata.
 *
 * Provides instant client-side persistence and fallback retrieval so that rejection reasons
 * and rejector details are preserved across page reloads and tab visits even before the
 * backend schema fully persists and returns rejection fields.
 */

export interface PolicyRejectionRecord {
  id: string; // policyId or spendProgramId
  reason: string;
  rejectedBy?: {
    userId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    roleName?: string;
    jobTitle?: string;
  };
  rejectedAt: string;
}

const EXPENSE_POLICY_KEY = "villeto_expense_policy_rejections";
const SPEND_PROGRAM_KEY = "villeto_spend_program_rejections";

function safeGetStorage(key: string): Record<string, PolicyRejectionRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function safeSetStorage(key: string, data: Record<string, PolicyRejectionRecord>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

// ─── Expense Policies ─────────────────────────────────────────────────────────

export function savePolicyRejection(record: PolicyRejectionRecord) {
  if (!record.id) return;
  const current = safeGetStorage(EXPENSE_POLICY_KEY);
  current[record.id] = record;
  safeSetStorage(EXPENSE_POLICY_KEY, current);
}

export function getPolicyRejection(id?: string | null): PolicyRejectionRecord | null {
  if (!id) return null;
  const current = safeGetStorage(EXPENSE_POLICY_KEY);
  return current[id] || null;
}

// ─── Spend Programs (Procurement Policies) ───────────────────────────────────

export function saveSpendProgramRejection(record: PolicyRejectionRecord) {
  if (!record.id) return;
  const current = safeGetStorage(SPEND_PROGRAM_KEY);
  current[record.id] = record;
  safeSetStorage(SPEND_PROGRAM_KEY, current);
}

export function getSpendProgramRejection(id?: string | null): PolicyRejectionRecord | null {
  if (!id) return null;
  const current = safeGetStorage(SPEND_PROGRAM_KEY);
  return current[id] || null;
}
