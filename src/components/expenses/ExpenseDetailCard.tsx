import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="space-y-4">
      {/* Grid of details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="detail-card">
          <p className="detail-label">Expense Title</p>
          <p className="detail-value">{expense.title}</p>
        </div>
        <div className="detail-card">
          <p className="detail-label">Department</p>
          <p className="detail-value">{expense.department}</p>
        </div>
        <div className="detail-card">
          <p className="detail-label">Date Submitted</p>
          <p className="detail-value">{expense.dateSubmitted}</p>
        </div>
        <div className="detail-card">
          <p className="detail-label">Vendor</p>
          <p className="detail-value">{expense.vendor}</p>
        </div>
        <div className="detail-card">
          <p className="detail-label">Expense Category</p>
          <p className="detail-value">{expense.category}</p>
        </div>
        <div className="detail-card">
          <p className="detail-label">Total Amount</p>
          <p className="detail-value">{expense.amount}</p>
        </div>
        <div className="detail-card">
          <p className="detail-label">Policy Compliance</p>
          <div className="flex items-center gap-1.5">
            {expense.policyCompliance === "within" ? (
              <>
                <CheckCircle2 size={16} className="text-success" />
                <span className="detail-value text-success">Within limit</span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="text-destructive" />
                <span className="detail-value text-destructive">
                  Exceeded Limit
                </span>
              </>
            )}
          </div>
        </div>
        <div className="detail-card">
          <p className="detail-label">Status</p>
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                expense.status === "approved"
                  ? "bg-success/10 text-success"
                  : expense.status === "rejected"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-warning/10 text-warning"
              }`}
            >
              {expense.status === "approved" && <CheckCircle2 size={12} />}
              {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="detail-card col-span-2">
        <p className="detail-label">Description</p>
        <p className="detail-value">{expense.description}</p>
      </div>

      {/* Action Buttons - Show only when status is pending AND user is authorized */}
      {(expense.status === "pending" || expense.status === "draft") && (
        <div className="flex gap-3 pt-4">
          {canApprove && (
            <>
              <Button
                onClick={onApprove}
                className="bg-primary hover:bg-primary/90 text-white flex-1"
                size="lg"
              >
                Approve
              </Button>
              <Button
                onClick={onReject}
                className="bg-destructive/10 hover:bg-destructive/20 text-destructive flex-1"
                size="lg"
              >
                Reject
              </Button>
            </>
          )}
          <Button
            onClick={onFlag}
            className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
            size="lg"
          >
            Flag
          </Button>
        </div>
      )}
    </div>
  );
}
