import React from "react";
import { X, Loader2 } from "lucide-react";
import { Policy } from "@/queries/companies/get-policies";
import { useApprovePolicy } from "@/queries/companies/approve-policy";
import { useRejectPolicy } from "@/queries/companies/reject-policy";
import { toast } from "sonner";
import { asRecord, pickString, getString } from "@/lib/types/api-error";

interface ReviewPolicyModalProps {
  policy: Policy | null;
  onClose: () => void;
}

const capitalizeName = (n: string) => n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";

export function ReviewPolicyModal({ policy, onClose }: ReviewPolicyModalProps) {
  const approveMutation = useApprovePolicy();
  const rejectMutation = useRejectPolicy();

  if (!policy) return null;

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ policyId: policy.policyId || (policy as any).id });
      toast.success("Policy approved successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to approve policy. It may have already been reviewed.");
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({ policyId: policy.policyId || (policy as any).id });
      toast.success("Policy rejected successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to reject policy. It may have already been reviewed.");
    }
  };

  // Helper to extract rules safely
  const rules = policy.rules || [];
  const spendLimitRule = rules.find(r => r.type === "spend_limit");
  const receiptRule = rules.find(r => r.type === "receipt_requirement");

  // Format Approvers text
  let approversText = "—";
  if (policy.approvalSetting?.approverRoles && policy.approvalSetting.approverRoles.length > 0) {
    approversText = policy.approvalSetting.approverRoles.map(r => r.name).join(", ");
  } else if (policy.approvalSetting?.allRolesCanApprove) {
    approversText = "All eligible roles";
  }

  // Categories
  const categoriesText = policy.expenseCategories && policy.expenseCategories.length > 0
    ? policy.expenseCategories.map((c: any) => typeof c === 'string' ? c : (c.name || "Unknown")).join(", ")
    : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[500px] flex flex-col p-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-[#0b100e]">Review Policy</h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-10 h-10 rounded-full bg-[#f9faf9] hover:bg-black/5 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#68726d]" />
          </button>
        </div>

        {/* Content */}
        <div className="border border-black/[0.08] rounded-2xl p-6 mb-8 flex flex-col gap-6 bg-[#fcfdfc]">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs text-[#84908a] mb-1">Policy Name</p>
              <p className="text-[15px] font-semibold text-[#10231d]">{capitalizeName(policy.name)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#84908a] mb-1">Applied To</p>
              <p className="text-[15px] font-medium text-[#52605b] capitalize">
                {(policy as any).appliedTo || (policy as any).scopeType === 'all' || (policy as any).scope?.type === 'all' ? 'All Employees' : 'Specific Employees'}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs text-[#84908a] mb-1">Expense Category</p>
              <p className="text-[15px] font-semibold text-[#10231d]">{categoriesText}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#84908a] mb-1">Rules</p>
              <div className="flex flex-col items-end gap-1">
                {spendLimitRule && (
                  <p className="text-[15px] font-medium text-[#52605b]">
                    Daily Limit: {((spendLimitRule as any).currency === 'NGN' ? '₦' : (spendLimitRule as any).currency || "$")}{Number((spendLimitRule as any).amount || 0).toLocaleString()}
                  </p>
                )}
                {receiptRule && (receiptRule as any).receiptNeeded !== false && (
                  <p className="text-[15px] font-medium text-[#10231d]">
                    Receipt required
                  </p>
                )}
                {!spendLimitRule && !receiptRule && <p className="text-[15px] text-[#84908a]">No specific rules</p>}
              </div>
            </div>
          </div>

          <div className="h-px bg-black/[0.06] w-full" />

          <div>
            <p className="text-xs text-[#84908a] mb-1">Approver(s)</p>
            <p className="text-[15px] font-medium text-[#52605b]">
              {approversText}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleReject}
            disabled={isPending}
            className="flex-1 max-w-[160px] h-12 rounded-xl border border-red-400 text-red-500 font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
          </button>
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 max-w-[160px] h-12 rounded-xl bg-[#087f70] text-white font-medium text-sm hover:bg-[#076b5e] transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
