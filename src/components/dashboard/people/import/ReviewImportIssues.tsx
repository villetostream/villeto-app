"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, RefreshCw, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ValidationError, ValidationResult, ValidationDuplicate } from "@/queries/users/bulk-validate";
import { EmployeeData } from "@/components/dashboard/people/invite/EmployeePreviewTable";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type DuplicateStrategy = "skip_existing" | "update_existing";
type IssueTab = "all" | "errors" | "duplicates" | "warnings";

interface ReviewImportIssuesProps {
    validationResult: ValidationResult;
    previewData: EmployeeData[];
    isSaving: boolean;
    onUploadDifferent: () => void;
    onContinueToImport: (strategy: DuplicateStrategy | undefined) => void;
}

/** Group errors by row number */
function groupByRow<T extends { row: number }>(items: T[]): Map<number, T[]> {
    const map = new Map<number, T[]>();
    for (const item of items) {
        const existing = map.get(item.row) ?? [];
        existing.push(item);
        map.set(item.row, existing);
    }
    return map;
}



function FieldBadge({ field, message }: { field: string; message: string }) {
    return (
        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-red-50 border border-red-200 text-red-500 text-[11px] font-semibold px-1.5 py-0.5 whitespace-nowrap cursor-help transition-colors hover:bg-red-100">
                    <AlertCircle className="size-2.5 shrink-0" />
                    {field.replace(/_/g, " ")}
                </span>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                className="max-w-[260px] rounded-[10px] bg-white border border-black/[0.08] px-3 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                sideOffset={6}
            >
                <p className="text-[12px] font-medium text-[#0b100e] leading-relaxed">{message}</p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-500 font-semibold">
                    <XCircle className="size-3 shrink-0" />
                    This row will be rejected by the system
                </p>
            </TooltipContent>
        </Tooltip>
    );
}

function WarningBadge({ field, message }: { field: string; message?: string }) {
    return (
        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-amber-50 border border-amber-200 text-amber-600 text-[11px] font-semibold px-1.5 py-0.5 whitespace-nowrap cursor-help transition-colors hover:bg-amber-100">
                    <AlertTriangle className="size-2.5 shrink-0" />
                    {field.replace(/_/g, " ")}
                </span>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                className="max-w-[260px] rounded-[10px] bg-white border border-black/[0.08] px-3 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                sideOffset={6}
            >
                <p className="text-[12px] font-medium text-[#0b100e] leading-relaxed">{message ?? "Non-critical warning — row will still be imported."}</p>
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
                    <AlertTriangle className="size-3 shrink-0" />
                    Row will still be imported
                </p>
            </TooltipContent>
        </Tooltip>
    );
}

/** Finds an EmployeeData row by 1-indexed row number (row 2 = index 0 because row 1 is the header) */
function getPreviewRow(previewData: EmployeeData[], rowNum: number): EmployeeData | undefined {
    return previewData[rowNum - 2]; // row 2 → index 0
}

interface IssueRowProps {
    row: EmployeeData | undefined;
    rowNum: number;
    issues: (ValidationError | ValidationDuplicate)[];
    variant: "error" | "duplicate" | "warning";
}

function IssueRow({ row, rowNum, issues, variant }: IssueRowProps) {
    const name = row
        ? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || `Row ${rowNum}`
        : `Row ${rowNum}`;
    const email = row?.email ?? "—";
    const department = row?.department_name ?? "—";
    const jobTitle = row?.job_title ?? "—";

    return (
        <tr className="border-b border-black/[0.04] hover:bg-[#fafafa] transition-colors text-[13px]">
            <td className="py-2.5 px-3 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#0b100e]">{name}</span>
                    {variant === "error" && (
                        <Tooltip delayDuration={150}>
                            <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 cursor-help transition-colors hover:bg-red-200">
                                    <XCircle className="size-2.5 shrink-0" /> rejected
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] rounded-[10px] bg-white border border-black/[0.08] px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)]" sideOffset={6}>
                                <p className="text-[12px] font-medium text-[#0b100e]">This row has critical errors and will be rejected during import.</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </td>
            <td className="py-2.5 px-3">
                {variant === "duplicate" ? (
                    <span className="text-amber-600 font-medium text-[12px] line-through">{email}</span>
                ) : (
                    <span className="text-[#66706b]">{email}</span>
                )}
            </td>
            <td className="py-2.5 px-3 text-[#66706b] whitespace-nowrap">{department}</td>
            <td className="py-2.5 px-3 text-[#66706b] whitespace-nowrap">{jobTitle}</td>
            <td className="py-2.5 px-3">
                <div className="flex flex-wrap gap-1">
                    {issues.map((issue, i) =>
                        variant === "warning"
                            ? <WarningBadge key={i} field={issue.field} message={issue.message} />
                            : <FieldBadge   key={i} field={issue.field} message={issue.message} />
                    )}
                </div>
            </td>
        </tr>
    );
}

interface SectionTableProps {
    title: string;
    count: number;
    rowMap: Map<number, (ValidationError | ValidationDuplicate)[]>;
    previewData: EmployeeData[];
    variant: "error" | "duplicate" | "warning";
    footer?: React.ReactNode;
    description?: string;
}

const sectionStyles = {
    error:     { border: "border-red-200",    bg: "bg-red-50/40",    title: "text-red-600",    dot: "bg-red-400" },
    duplicate: { border: "border-amber-200",  bg: "bg-amber-50/40",  title: "text-amber-600",  dot: "bg-amber-400" },
    warning:   { border: "border-yellow-200", bg: "bg-yellow-50/40", title: "text-yellow-600", dot: "bg-yellow-400" },
};

function SectionTable({ title, count, rowMap, previewData, variant, footer, description }: SectionTableProps) {
    const s = sectionStyles[variant];
    return (
        <div className={cn("rounded-[12px] border overflow-hidden", s.border, s.bg)}>
            {/* Section header */}
            <div className="px-5 py-3 border-b border-inherit flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                    <h3 className={cn("text-[13px] font-semibold", s.title)}>
                        {title} <span className="font-bold">{count}</span>
                    </h3>
                </div>
                {description && (
                    <p className="text-[12px] text-[#84908a] pl-4">{description}</p>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                    <thead>
                        <tr className="border-b border-inherit">
                            {["Full Name", "Email Address", "Department", "Job Title", "Issues"].map((h) => (
                                <th key={h} className="py-2 px-3 text-left text-[11px] font-semibold text-[#84908a] uppercase tracking-[0.06em] whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from(rowMap.entries()).map(([rowNum, issues]) => (
                            <IssueRow
                                key={rowNum}
                                row={getPreviewRow(previewData, rowNum)}
                                rowNum={rowNum}
                                issues={issues}
                                variant={variant}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Section footer */}
            {footer && (
                <div className="flex justify-end px-5 py-3 border-t border-inherit">
                    {footer}
                </div>
            )}
        </div>
    );
}

export default function ReviewImportIssues({
    validationResult,
    previewData,
    isSaving,
    onUploadDifferent,
    onContinueToImport,
}: ReviewImportIssuesProps) {
    const [activeTab, setActiveTab] = useState<IssueTab>("all");
    const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("skip_existing");

    const hardErrors = validationResult.errors ?? [];
    const duplicateErrors = validationResult.duplicates ?? [];
    const warnings = validationResult.warnings ?? [];

    const errorRowMap     = groupByRow(hardErrors);
    const duplicateRowMap = groupByRow(duplicateErrors);
    const warningRowMap   = groupByRow(warnings);

    const errorCount     = errorRowMap.size;
    const duplicateCount = duplicateRowMap.size;
    const warningCount   = warningRowMap.size;

    const summary = validationResult.summary;

    const TABS: { id: IssueTab; label: string; count: number }[] = [
        { id: "all" as IssueTab,        label: "All",        count: errorCount + duplicateCount + warningCount },
        { id: "errors" as IssueTab,     label: "Errors",     count: errorCount },
        { id: "duplicates" as IssueTab, label: "Duplicates", count: duplicateCount },
        { id: "warnings" as IssueTab,   label: "Warnings",   count: warningCount },
    ].filter((t) => t.id === "all" || t.count > 0);

    // Hard errors (non-duplicate validation failures) BLOCK import entirely.
    // The backend always rejects any file containing errors, regardless of duplicateStrategy.
    const hasBlockingErrors = errorCount > 0;
    const canProceed = !hasBlockingErrors && (summary.validRows > 0 || warningCount > 0 || duplicateCount > 0);

    const tabColor: Record<IssueTab, string> = {
        all:        "text-[#0ea894] border-[#0ea894]",
        errors:     "text-red-500 border-red-400",
        duplicates: "text-amber-500 border-amber-400",
        warnings:   "text-yellow-500 border-yellow-400",
    };

    return (
        <TooltipProvider>
        <div className="flex flex-col h-full space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 flex-shrink-0">
                <div>
                    <h2 className="text-[18px] font-semibold text-[#0b100e]">Review Import Issues</h2>
                    <p className="text-[13px] text-[#66706b] mt-0.5">
                        Below are some issues found in the file uploaded
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={onUploadDifferent}
                    disabled={isSaving}
                    className="h-[42px] rounded-[10px] border-black/[0.1] text-[#303834] hover:bg-[#f5f7f6] text-[13px] font-semibold w-full sm:w-auto gap-2"
                >
                    <Upload className="size-3.5" />
                    Upload a different file
                </Button>
            </div>

            {/* Summary bar */}
            <div className="flex items-center gap-4 text-[12px] text-[#66706b] bg-[#f9faf9] border border-black/[0.08] rounded-[10px] px-4 py-2.5 flex-shrink-0 flex-wrap gap-y-1">
                <span><span className="font-semibold text-[#0b100e]">{summary.totalRows}</span> total rows</span>
                <span className="text-[#d0d7d4]">·</span>
                <span className="text-[#087f70]"><span className="font-semibold">{summary.validRows}</span> valid</span>
                {duplicateCount > 0 && <>
                    <span className="text-[#d0d7d4]">·</span>
                    <span className="text-amber-600"><span className="font-semibold">{duplicateCount}</span> duplicate{duplicateCount !== 1 ? "s" : ""}</span>
                </>}
                {warningCount > 0 && <>
                    <span className="text-[#d0d7d4]">·</span>
                    <span className="text-yellow-600"><span className="font-semibold">{warningCount}</span> warning{warningCount !== 1 ? "s" : ""}</span>
                </>}
                {errorCount > 0 && <>
                    <span className="text-[#d0d7d4]">·</span>
                    <span className="text-red-500"><span className="font-semibold">{errorCount}</span> error{errorCount !== 1 ? "s" : ""} (will be rejected)</span>
                </>}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-black/[0.08] gap-6 flex-shrink-0">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "pb-2.5 text-[13px] font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap",
                                isActive
                                    ? tabColor[tab.id]
                                    : "text-[#66706b] border-transparent hover:text-[#0b100e]"
                            )}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={cn(
                                    "ml-1.5 inline-flex items-center justify-center h-[18px] min-w-[18px] rounded-full text-[10px] font-bold px-1",
                                    isActive
                                        ? tab.id === "errors"     ? "bg-red-100 text-red-600"
                                        : tab.id === "duplicates" ? "bg-amber-100 text-amber-600"
                                        : tab.id === "warnings"   ? "bg-yellow-100 text-yellow-600"
                                        : "bg-[#e7f6f2] text-[#087f70]"
                                        : "bg-[#f0f2f1] text-[#66706b]"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab content — scrollable area */}
            <div className="flex-1 overflow-y-auto space-y-5 min-h-0 pb-2">
                {/* Errors section */}
                {(activeTab === "all" || activeTab === "errors") && errorCount > 0 && (
                    <SectionTable
                        title="Errors"
                        count={errorRowMap.size}
                        rowMap={errorRowMap}
                        previewData={previewData}
                        variant="error"
                        description="These rows have critical issues and will cause the import to be rejected."
                        footer={
                            <Button
                                variant="outline"
                                onClick={onUploadDifferent}
                                className="h-[38px] rounded-[9px] border-red-300 text-red-500 hover:bg-red-50 text-[12px] font-semibold gap-2"
                            >
                                <RefreshCw className="size-3" />
                                Re-upload corrected file
                            </Button>
                        }
                    />
                )}

                {/* Duplicates section */}
                {(activeTab === "all" || activeTab === "duplicates") && duplicateCount > 0 && (
                    <SectionTable
                        title="Duplicates"
                        count={duplicateRowMap.size}
                        rowMap={duplicateRowMap}
                        previewData={previewData}
                        variant="duplicate"
                        description="These employee IDs are already in your directory. Choose how to handle them."
                        footer={
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setDuplicateStrategy("skip_existing")}
                                    className={cn(
                                        "h-[38px] rounded-[9px] text-[12px] font-semibold border transition-all",
                                        duplicateStrategy === "skip_existing"
                                            ? "bg-[#e7f6f2] border-[#0ea894] text-[#087f70]"
                                            : "border-black/[0.1] text-[#303834] hover:bg-[#f5f7f6]"
                                    )}
                                >
                                    Keep Existing Records
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setDuplicateStrategy("update_existing")}
                                    className={cn(
                                        "h-[38px] rounded-[9px] text-[12px] font-semibold border transition-all",
                                        duplicateStrategy === "update_existing"
                                            ? "bg-[#e7f6f2] border-[#0ea894] text-[#087f70]"
                                            : "border-black/[0.1] text-[#303834] hover:bg-[#f5f7f6]"
                                    )}
                                >
                                    Update Existing Records
                                </Button>
                            </div>
                        }
                    />
                )}

                {/* Warnings section */}
                {(activeTab === "all" || activeTab === "warnings") && warningCount > 0 && (
                    <SectionTable
                        title="Warnings"
                        count={warningRowMap.size}
                        rowMap={warningRowMap}
                        previewData={previewData}
                        variant="warning"
                        description="These rows have non-critical issues. They will still be imported unless you remove them."
                        footer={
                            <span className="text-[12px] text-[#84908a] italic">
                                Warnings are imported automatically — no action required.
                            </span>
                        }
                    />
                )}

                {/* Empty state for a filtered tab with no items */}
                {activeTab !== "all" &&
                    ((activeTab === "errors"     && errorCount === 0)     ||
                     (activeTab === "duplicates" && duplicateCount === 0) ||
                     (activeTab === "warnings"   && warningCount === 0)) && (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-[#84908a]">
                        <p className="text-[14px] font-semibold text-[#0b100e] mb-1">No {activeTab} found</p>
                        <p className="text-[13px]">This category has no issues in your file.</p>
                    </div>
                )}
            </div>

            {/* Footer CTA */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 flex-shrink-0 pt-4 border-t border-black/[0.06]">

                {hasBlockingErrors ? (
                    /* ── Blocked state: errors must be fixed first ── */
                    <>
                        <div className="flex items-start gap-2.5">
                            <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[12px] text-[#0b100e] leading-5">
                                <span className="font-semibold text-red-500">
                                    {errorRowMap.size} row{errorRowMap.size !== 1 ? "s" : ""} with critical errors
                                </span>{" "}
                                must be fixed before importing. The system will reject any file that contains errors.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={onUploadDifferent}
                            className="h-[46px] rounded-[10px] border-red-300 text-red-500 hover:bg-red-50 text-[13px] font-semibold px-6 gap-2 sm:w-auto w-full"
                        >
                            <RefreshCw className="size-3.5" />
                            Re-upload corrected file
                        </Button>
                    </>
                ) : (
                    /* ── Proceed state: only duplicates / warnings remain ── */
                    <>
                        <p className="text-[12px] text-[#84908a] leading-5">
                            {duplicateCount > 0 && (
                                <>Duplicates will be{" "}
                                <span className="font-semibold text-[#0b100e]">
                                    {duplicateStrategy === "skip_existing" ? "kept as-is" : "updated"}.
                                </span>{" "}</>
                            )}
                            {warningCount > 0 && (
                                <><span className="font-semibold text-amber-600">{warningCount} row{warningCount !== 1 ? "s" : ""}</span> with warnings will be imported automatically.</>                            
                            )}
                        </p>
                        <Button
                            onClick={() => onContinueToImport(duplicateCount > 0 ? duplicateStrategy : undefined)}
                            disabled={isSaving || !canProceed}
                            className="h-[46px] rounded-[10px] bg-[#0ea894] hover:bg-[#0c9785] text-white text-[13px] font-semibold px-8 shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 sm:w-auto w-full"
                        >
                            {isSaving ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</>
                            ) : (
                                "Continue to Import"
                            )}
                        </Button>
                    </>
                )}
            </div>
        </div>
        </TooltipProvider>
    );
}
