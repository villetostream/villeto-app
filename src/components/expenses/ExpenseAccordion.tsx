"use client"

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { ExpenseDetailCard } from "./ExpenseDetailCard";
import { ReceiptPreview } from "./ReceiptPreview";
import { Badge } from "../ui/badge";
import { getStatusIcon } from "@/lib/helper";
import Link from "next/link";

interface ExpenseData {
    id: string;
    title: string;
    department: string;
    dateSubmitted: string;
    vendor: string;
    category: string;
    amount: string;
    paymentMethod: string;
    policyCompliance: "within" | "exceeded";
    currency: string;
    status: "approved" | "rejected" | "pending";
    description: string;
    hasSplitExpense?: boolean;
    accordionTitle?: string; // Optional separate title for accordion header
}

interface ExpenseAccordionProps {
    expense: ExpenseData;
    defaultOpen?: boolean;
    onApprove?: () => void;
    onReject?: () => void;
    previousPage?: "batch" | "detail"; // Track where we came from
}

export function ExpenseAccordion({ expense, defaultOpen = false, onApprove, onReject, previousPage }: ExpenseAccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const handleLinkClick = (_type: "split-expense" | "audit-trail") => {
        // Store previous page info for back navigation
        if (previousPage) {
            sessionStorage.setItem("expensePreviousPage", previousPage);
            if (previousPage === "batch") {
                // Get employee slug from current URL
                const pathParts = window.location.pathname.split("/");
                const employeeSlug = pathParts[pathParts.length - 1];
                sessionStorage.setItem("batchEmployeeSlug", employeeSlug);
            }
        }
    };

    return (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-6 py-4 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{expense.accordionTitle || expense.title}</span>
                    <Badge variant={expense.status === "rejected" ? "rejected" : expense.status}>
                        {getStatusIcon(expense.status === "rejected" ? "declined" : expense.status === "approved" ? "approved" : expense.status === "pending" ? "pending" : "pending")}
                        <span className="ml-1 capitalize">{expense.status === "rejected" ? "Rejected" : expense.status}</span>
                    </Badge>
                </div>
                {isOpen ? (
                    <ChevronUp size={20} className="text-muted-foreground" />
                ) : (
                    <ChevronDown size={20} className="text-muted-foreground" />
                )}
            </button>

            {/* Content */}
            {isOpen && (
                <div className="p-6 animate-fade-in">
                    <div className="flex gap-8">
                        {/* Expense Details */}
                        <div className="flex-1">
                            <ExpenseDetailCard expense={expense} onApprove={onApprove} onReject={onReject} />
                        </div>

                        {/* Receipt */}
                        <div className="shrink-0">
                            <ReceiptPreview />
                        </div>
                    </div>

                    {/* Split Expense Link */}
                    {expense.hasSplitExpense ? (
                        <div className="mt-4 text-right">
                            <Link
                                href={`/expenses/${expense.id}/split-expense`}
                                className="text-sm text-primary hover:underline font-medium"
                                onClick={() => handleLinkClick("split-expense")}
                            >
                                View Split Expense
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-4 text-right">
                            <Link
                                href={`/expenses/${expense.id}/audit-trail`}
                                className="text-sm text-primary hover:underline font-medium"
                                onClick={() => handleLinkClick("audit-trail")}
                            >
                                View Audit Trail
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}