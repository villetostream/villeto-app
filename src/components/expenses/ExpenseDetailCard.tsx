import { CheckCircle2, AlertTriangle } from "lucide-react";

interface ExpenseData {
  title: string;
  department: string;
  dateSubmitted: string;
  vendor: string;
  category: string;
  amount: string;
  policyCompliance: "within" | "exceeded";
  status: "approved" | "rejected" | "pending" | "draft" | "submitted";
  description: string;
}

interface ExpenseDetailCardProps {
  expense: ExpenseData;
  onApprove?: () => void;
  onReject?: () => void;
  onFlag?: () => void;
  canApprove?: boolean;
}

export function ExpenseDetailCard({
  expense,
  onApprove,
  onReject,
  onFlag,
  canApprove = true,
}: ExpenseDetailCardProps) {
  const statusStyles: Record<string, string> = {
    approved: "text-[#087f70] bg-[#f0faf8] border border-[#e7f6f2]",
    rejected: "text-[#d33d44] bg-[#fdf2f2] border border-[#fbd5d5]",
    pending:  "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]",
    draft:    "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]",
    submitted:"text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]",
  };

  const statusLabel: Record<string, string> = {
    approved:  "Approved",
    rejected:  "Rejected",
    pending:   "Pending Review",
    draft:     "Draft",
    submitted: "Pending Review",
  };

  return (
    <div className="space-y-4">
      {/* Grid of details */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Expense Title",    value: expense.title },
          { label: "Department",       value: expense.department },
          { label: "Date Submitted",   value: expense.dateSubmitted },
          { label: "Vendor",           value: expense.vendor },
          { label: "Expense Category", value: expense.category },
          { label: "Total Amount",     value: expense.amount },
        ].map(({ label, value }) => (
          <div key={label} className="border border-black/[0.06] rounded-[10px] p-3 bg-white">
            <p className="text-[12px] font-medium text-[#84908a] mb-0.5">{label}</p>
            <p className="text-[13px] font-semibold text-[#0b100e]">{value}</p>
          </div>
        ))}

        {/* Policy Compliance */}
        <div className="border border-black/[0.06] rounded-[10px] p-3 bg-white">
          <p className="text-[12px] font-medium text-[#84908a] mb-0.5">Policy Compliance</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {expense.policyCompliance === "within" ? (
              <>
                <CheckCircle2 size={14} className="text-[#087f70]" />
                <span className="text-[13px] font-semibold text-[#087f70]">Within limit</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="text-[#d33d44]" />
                <span className="text-[13px] font-semibold text-[#d33d44]">Exceeded Limit</span>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="border border-black/[0.06] rounded-[10px] p-3 bg-white">
          <p className="text-[12px] font-medium text-[#84908a] mb-1">Status</p>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[expense.status] ?? statusStyles.pending}`}>
            {expense.status === "approved" && <CheckCircle2 size={11} />}
            {statusLabel[expense.status] ?? expense.status}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="border border-black/[0.06] rounded-[10px] p-3 bg-white">
        <p className="text-[12px] font-medium text-[#84908a] mb-0.5">Description</p>
        <p className="text-[13px] font-medium text-[#68726d]">{expense.description}</p>
      </div>

      {/* Action Buttons */}
      {(expense.status === "pending" || expense.status === "draft") && (
        <div className="flex gap-2.5 pt-2">
          {canApprove && (
            <>
              <button
                onClick={onApprove}
                className="flex-1 h-9 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors shadow-sm"
              >
                Approve
              </button>
              <button
                onClick={onReject}
                className="flex-1 h-9 rounded-[8px] border border-[#d33d44] text-[#d33d44] font-semibold text-[13px] hover:bg-[#fdf2f2] transition-colors"
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={onFlag}
            className="flex-1 h-9 rounded-[8px] border border-[#b27b00] text-[#b27b00] font-semibold text-[13px] hover:bg-[#fff9e6] transition-colors"
          >
            Flag
          </button>
        </div>
      )}
    </div>
  );
}
