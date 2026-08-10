"use client";

import { Loader2, ShieldCheck, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { ValidationResult } from "@/queries/users/bulk-validate";
import { cn } from "@/lib/utils";

interface ValidationSummaryModalProps {
    open: boolean;
    result: ValidationResult | null;
    isLoading: boolean;
    /** Called when user cancels the import from this modal */
    onCancel: () => void;
    /** Called when user wants to review the issues */
    onReviewIssues: () => void;
    /** Called when validation passed and user wants to proceed to import */
    onProceedToImport: () => void;
}

interface StatCardProps {
    label: string;
    value: number;
    variant: "neutral" | "success" | "warning" | "danger" | "info";
}

const variantStyles: Record<StatCardProps["variant"], { bg: string; label: string; value: string }> = {
    neutral: { bg: "bg-[#f9faf9] border border-black/[0.04]", label: "text-[#66706b]", value: "text-[#0b100e]" },
    success: { bg: "bg-[#e7f6f2] border border-[#c3ece7]", label: "text-[#087f70]", value: "text-[#087f70]" },
    warning: { bg: "bg-amber-50 border border-amber-100", label: "text-amber-700", value: "text-amber-600" },
    info:    { bg: "bg-[#fef3e8] border border-[#fddbb6]", label: "text-[#9a4a00]", value: "text-[#e67300]" },
    danger:  { bg: "bg-red-50 border border-red-100", label: "text-red-700", value: "text-red-600" },
};

function StatCard({ label, value, variant }: StatCardProps) {
    const s = variantStyles[variant];
    return (
        <div className={cn("rounded-[14px] px-4 py-5 flex flex-col min-w-0 flex-1", s.bg)}>
            <p className={cn("text-[12px] font-semibold uppercase tracking-[0.04em]", s.label)}>{label}</p>
            <p className={cn("text-[32px] font-bold mt-1 leading-none tracking-tight", s.value)}>{value.toLocaleString()}</p>
        </div>
    );
}

export default function ValidationSummaryModal({
    open,
    result,
    isLoading,
    onCancel,
    onReviewIssues,
    onProceedToImport,
}: ValidationSummaryModalProps) {
    const summary = result?.summary;
    const isValid = result?.valid;
    const hasIssues = !isValid || (summary && (summary.errorRows > 0 || summary.warningRows > 0 || summary.duplicateRows > 0));

    const duplicateCount = summary?.duplicateRows ?? 0;

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o && !isLoading) onCancel(); }}>
            <DialogContent
                className="sm:max-w-[850px] p-0 bg-white rounded-2xl border border-black/[0.08] shadow-2xl overflow-hidden gap-0"
                onInteractOutside={(e) => isLoading && e.preventDefault()}
            >
                {/* Icon & Header */}
                <div className="flex flex-col items-center pt-10 px-8 pb-8 text-center">
                    <div className={cn(
                        "w-[64px] h-[64px] rounded-[18px] flex items-center justify-center mb-5 transition-colors",
                        isLoading ? "bg-[#e7f6f2]" : 
                        isValid ? "bg-[#e7f6f2]" : "bg-red-50"
                    )}>
                        {isLoading ? (
                            <Loader2 className="w-7 h-7 text-[#0ea894] animate-spin" strokeWidth={1.7} />
                        ) : isValid ? (
                            <ShieldCheck className="w-7 h-7 text-[#0ea894]" strokeWidth={1.7} />
                        ) : (
                            <ShieldAlert className="w-7 h-7 text-red-500" strokeWidth={1.7} />
                        )}
                    </div>

                    <p className="text-[14px] text-[#66706b] max-w-sm mx-auto leading-relaxed">
                        {isLoading
                            ? "Please wait while we analyze your data."
                            : "We've analyzed your CSV. Review any issues before importing employees into Villeto."}
                    </p>
                </div>

                {/* Stats */}
                {!isLoading && summary && (
                    <div className="px-8 pb-10">
                        <div className="flex gap-4 flex-nowrap w-full">
                            <StatCard label="Total Records" value={summary.totalRows}    variant="neutral" />
                            <StatCard label="Valid Records" value={summary.validRows}    variant="success" />
                            {summary.warningRows > 0 && (
                                <StatCard label="Warnings"     value={summary.warningRows} variant="warning" />
                            )}
                            {duplicateCount > 0 && (
                                <StatCard label="Duplicates"   value={duplicateCount}      variant="info" />
                            )}
                            {summary.errorRows > 0 && (
                                <StatCard label="Errors"       value={summary.errorRows}   variant="danger" />
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                {!isLoading && (
                    <div className="px-8 pb-8 pt-6 flex gap-4 justify-end border-t border-black/[0.06]">
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            className="h-[46px] rounded-[10px] border-black/[0.1] text-[#303834] hover:bg-[#f5f7f6] text-[13px] font-semibold px-6"
                        >
                            Cancel Import
                        </Button>

                        {hasIssues ? (
                            <Button
                                onClick={onReviewIssues}
                                className="h-[46px] rounded-[10px] bg-[#0ea894] hover:bg-[#0c9785] text-white text-[13px] font-semibold px-6 shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all flex items-center gap-2"
                            >
                                Review Issues <ArrowRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={onProceedToImport}
                                className="h-[46px] rounded-[10px] bg-[#0ea894] hover:bg-[#0c9785] text-white text-[13px] font-semibold px-6 shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all flex items-center gap-2"
                            >
                                Proceed to Import <ArrowRight className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
