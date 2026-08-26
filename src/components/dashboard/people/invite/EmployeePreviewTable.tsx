"use client";
import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { useDataTable } from "@/components/datatable/useDataTable";
import { cn } from "@/lib/utils";

export interface EmployeeData {
    id: string;
    // Required
    first_name: string;
    last_name: string;
    email: string;
    // Optional
    employee_external_id: string;
    manager_external_id: string;
    department_name: string;
    department_external_id: string;
    job_title: string;
    management_level: string;
    job_grade: string;
    business_unit: string;
    location: string;
    employment_type: string;
    status: string;
    effective_date: string;
    // Legacy compat
    manager_id?: string;
    role_name?: string;
}

interface ColumnDef {
    key: keyof EmployeeData;
    label: string;
    required: boolean;
    minW?: string;
}

const COLUMNS: ColumnDef[] = [
    { key: "employee_external_id",  label: "Employee ID",         required: true, minW: "140px" },
    { key: "first_name",            label: "First Name",          required: true,  minW: "120px" },
    { key: "last_name",             label: "Last Name",           required: true,  minW: "120px" },
    { key: "email",                 label: "Email",               required: true,  minW: "200px" },
    { key: "manager_external_id",   label: "Manager ID",          required: true, minW: "120px" },
    { key: "department_name",       label: "Department",          required: true, minW: "140px" },
    { key: "department_external_id",label: "Dept. ID",            required: true, minW: "100px" },
    { key: "job_title",             label: "Job Title",           required: true, minW: "160px" },
    { key: "management_level",      label: "Mgmt. Level",         required: true, minW: "120px" },
    { key: "job_grade",             label: "Job Grade",           required: true, minW: "100px" },
    { key: "business_unit",         label: "Business Unit",       required: false, minW: "140px" },
    { key: "location",              label: "Location",            required: false, minW: "120px" },
    { key: "employment_type",       label: "Employment Type",     required: false, minW: "150px" },
    { key: "status",                label: "Status",              required: false, minW: "100px" },
    { key: "effective_date",        label: "Effective Date",      required: false, minW: "130px" },
];

interface EmployeePreviewTableProps {
    data: EmployeeData[];
    onDataChange: (data: EmployeeData[]) => void;
    onUploadDifferent: () => void;
    onSaveToDirectory: () => void;
    onSaveAndInviteAll: () => void;
    isSaving?: boolean;
    saveOnlyMode?: boolean;
}

const PAGE_SIZE_OPTIONS = [
    { label: "5",   value: "5" },
    { label: "10",  value: "10" },
    { label: "20",  value: "20" },
    { label: "50",  value: "50" },
    { label: "100", value: "100" },
];

/** Checks whether a column has ANY value across all rows */
function colHasData(data: EmployeeData[], key: keyof EmployeeData): boolean {
    return data.some((row) => {
        const v = row[key];
        return v !== undefined && v !== null && String(v).trim() !== "";
    });
}

export default function EmployeePreviewTable({
    data,
    onDataChange: _onDataChange,
    onUploadDifferent,
    onSaveToDirectory,
    onSaveAndInviteAll,
    isSaving = false,
    saveOnlyMode = false,
}: EmployeePreviewTableProps) {

    const totalItems = data.length;

    const tableProps = useDataTable({
        initialPage: 1,
        initialPageSize: 10,
        totalItems,
        manualPagination: false,
    });
    const { paginationProps } = tableProps;

    const pageSize    = paginationProps.pageSize;
    const currentPage = paginationProps.page;
    const totalPages  = Math.max(1, Math.ceil(totalItems / pageSize));

    const startIndex   = (currentPage - 1) * pageSize;
    const endIndex     = Math.min(startIndex + pageSize, totalItems);
    const paginatedData = data.slice(startIndex, endIndex);

    // Only show columns that appear in the data OR are required
    const visibleCols = COLUMNS.filter((col) => col.required || colHasData(data, col.key));

    const isRowMissingRequired = (row: EmployeeData) => {
        const basicCols = [
            "employee_external_id", "first_name", "last_name", "email", 
            "manager_external_id", "department_name", "department_external_id", "job_title"
        ];
        const missingBasic = basicCols.some((k) => !row[k as keyof EmployeeData]?.trim());
        const missingLevelAndGrade = !row.management_level?.trim() && !row.job_grade?.trim();
        return missingBasic || missingLevelAndGrade;
    };

    // Count missing required fields for the warning banner
    const missingRequired = data.filter(isRowMissingRequired).length;

    const getPageNumbers = (current: number, total: number) => {
        const delta = 2;
        const pages: number[] = [];
        for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
            pages.push(i);
        }
        return pages;
    };

    const pageNumbers = getPageNumbers(currentPage, totalPages);

    const getCellValue = (employee: EmployeeData, key: keyof EmployeeData): string => {
        const v = employee[key];
        return v !== undefined && v !== null && String(v).trim() !== "" ? String(v) : "";
    };

    return (
        <>
            <div className="flex flex-col h-full space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 flex-shrink-0">
                    <div>
                        <h2 className="text-[16px] font-semibold text-[#0b100e]">Preview Directory</h2>
                        <p className="text-[13px] text-[#66706b] mt-0.5">
                            {totalItems} employee{totalItems !== 1 ? "s" : ""} loaded — review before saving
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={onUploadDifferent}
                        disabled={isSaving}
                        className="h-[42px] rounded-[10px] border-black/[0.1] text-[#303834] hover:bg-[#f5f7f6] text-[13px] font-semibold w-full sm:w-auto"
                    >
                        Upload a different file
                    </Button>
                </div>

                {/* Column legend */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="flex items-center gap-1.5 text-[11px] text-[#66706b]">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#0ea894]" />
                        Required field
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-[#66706b]">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#d0d7d4]" />
                        Optional field
                    </span>
                    <span className="text-[11px] text-[#84908a]">
                        · Only columns present in your file are shown
                    </span>
                </div>

                {/* Missing required data warning */}
                {missingRequired > 0 && (
                    <div className="flex items-start gap-3 rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 flex-shrink-0">
                        <AlertCircle className="mt-0.5 size-[16px] shrink-0 text-amber-600" strokeWidth={1.8} />
                        <p className="text-[12px] text-amber-700 leading-5">
                            <span className="font-semibold">{missingRequired} row{missingRequired !== 1 ? "s" : ""}</span> {missingRequired !== 1 ? "are" : "is"} missing required fields. Please ensure fields up to Job Title (plus Management Level or Job Grade) are filled. These entries may be rejected by the server.
                        </p>
                    </div>
                )}

                {/* Table with horizontal scroll */}
                <div className="border border-black/[0.08] rounded-[12px] flex-1 overflow-hidden relative bg-white">
                    <Table wrapperClassName="absolute inset-0 overflow-auto" className="min-w-max w-full">
                        <TableHeader className="bg-[#f9faf9] sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                            <TableRow className="hover:bg-transparent border-none">
                                    {visibleCols.map((col) => (
                                        <TableHead
                                            key={col.key}
                                            style={{ minWidth: col.minW }}
                                            className="h-10 px-3"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={cn(
                                                        "h-1.5 w-1.5 rounded-full shrink-0",
                                                        col.required ? "bg-[#0ea894]" : "bg-[#d0d7d4]"
                                                    )}
                                                />
                                                <span className="font-semibold text-[11px] text-[#84908a] uppercase tracking-[0.06em] whitespace-nowrap">
                                                    {col.label}
                                                </span>
                                                {!col.required && (
                                                    <span className="text-[9px] font-medium text-[#9aa49e] bg-[#f0f2f1] rounded px-1 py-0.5 leading-none">
                                                        opt
                                                    </span>
                                                )}
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={visibleCols.length + 1}
                                            className="text-center text-[#84908a] text-[13px] py-12"
                                        >
                                            No employees to preview.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((employee) => {
                                        const isMissing = isRowMissingRequired(employee);
                                        const hasLevelOrGrade = !!employee.management_level?.trim() || !!employee.job_grade?.trim();

                                        return (
                                            <TableRow
                                                key={employee.id}
                                                className={cn(
                                                    "border-b border-black/[0.04] transition-colors text-[13px]",
                                                    isMissing
                                                        ? "bg-amber-50/60 hover:bg-amber-50"
                                                        : "hover:bg-[#f5f7f6]"
                                                )}
                                            >
                                                {visibleCols.map((col) => {
                                                    const val = getCellValue(employee, col.key);
                                                    const isEmpty = val === "";
                                                    const isStatusCol = col.key === "status";
                                                    const isMgmtOrGrade = col.key === "management_level" || col.key === "job_grade";
                                                    
                                                    // If it's a conditionally required field (mgmt/grade) and one of them is provided, it's not "missing"
                                                    const isColMissing = col.required && isEmpty && !(isMgmtOrGrade && hasLevelOrGrade);

                                                    return (
                                                        <TableCell
                                                            key={col.key}
                                                            className={cn(
                                                                "px-3 py-2.5 whitespace-nowrap",
                                                                isColMissing
                                                                    ? "text-red-400 font-medium"
                                                                    : col.required
                                                                    ? "font-semibold text-[#0b100e]"
                                                                    : "text-[#66706b]"
                                                            )}
                                                        >
                                                            {isStatusCol && val ? (
                                                                <StatusBadge status={val} />
                                                            ) : (
                                                                isEmpty ? (
                                                                    isColMissing ? (
                                                                        <span className="flex items-center gap-1 text-red-400 text-[12px]">
                                                                            <AlertCircle className="size-3 shrink-0" />
                                                                            Missing
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[#c2c9c5]">—</span>
                                                                    )
                                                                ) : val
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                                {/* End of row cells */}
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                </div>

                {/* Pagination */}
                {totalItems > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between bg-[#f9faf9] py-3 px-4 border border-black/[0.08] rounded-[12px] w-full flex-shrink-0 gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span className="text-[12px] text-[#66706b] font-medium whitespace-nowrap">
                                Showing {startIndex + 1}–{endIndex} of {totalItems}
                            </span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(value) => {
                                    paginationProps.setPageSize(Number(value));
                                    paginationProps.setPage(1);
                                }}
                            >
                                <SelectTrigger className="w-fit min-w-[70px] h-8 rounded-[8px] text-[12px] border-black/[0.1] bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex w-full md:w-auto justify-center md:justify-end">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={(e) => { e.preventDefault(); paginationProps.setPage(Math.max(1, currentPage - 1)); }}
                                            href="#"
                                            isDisabled={currentPage === 1}
                                            isActive={currentPage > 1}
                                            size="sm"
                                        />
                                    </PaginationItem>

                                    {pageNumbers[0] > 1 && (
                                        <>
                                            <PaginationItem>
                                                <PaginationLink onClick={(e) => { e.preventDefault(); paginationProps.setPage(1); }} href="#" isActive={1 === currentPage} size="sm">1</PaginationLink>
                                            </PaginationItem>
                                            {pageNumbers[0] > 2 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
                                        </>
                                    )}

                                    <div className="hidden md:flex">
                                        {pageNumbers.map((page) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    className={currentPage !== page ? "text-muted-foreground" : ""}
                                                    onClick={(e) => { e.preventDefault(); paginationProps.setPage(page); }}
                                                    href="#" isActive={page === currentPage} size="sm"
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}

                                        {pageNumbers[pageNumbers.length - 1] < totalPages && (
                                            <>
                                                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                                                    <PaginationItem><PaginationEllipsis /></PaginationItem>
                                                )}
                                                <PaginationItem>
                                                    <PaginationLink href="#" size="sm" isActive={totalPages === currentPage} onClick={(e) => { e.preventDefault(); paginationProps.setPage(totalPages); }}>
                                                        {totalPages}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            </>
                                        )}
                                    </div>

                                    <div className="md:hidden block">
                                        <PaginationItem>
                                            <PaginationLink isActive size="sm" href="">{currentPage}</PaginationLink>
                                        </PaginationItem>
                                    </div>

                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={(e) => { e.preventDefault(); paginationProps.setPage(currentPage + 1); }}
                                            href="#" size="sm"
                                            isActive={currentPage < totalPages}
                                            isDisabled={currentPage === totalPages}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 flex-shrink-0">
                    <Button
                        variant={saveOnlyMode ? "default" : "outline"}
                        className={`h-[46px] rounded-[10px] text-[13px] font-semibold w-full sm:w-auto sm:min-w-[160px] ${
                            saveOnlyMode
                                ? "bg-[#0ea894] hover:bg-[#0c9785] text-white shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all"
                                : "border-[#0ea894]/40 text-[#087f70] hover:bg-[#e7f6f2] hover:border-[#0ea894]/60 transition-all"
                        }`}
                        onClick={onSaveToDirectory}
                        disabled={isSaving || data.length === 0}
                        data-tour="save-to-directory-button"
                    >
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save to Directory"}
                    </Button>
                    {!saveOnlyMode && (
                        <Button
                            className="h-[46px] rounded-[10px] bg-[#0ea894] hover:bg-[#0c9785] text-white text-[13px] font-semibold px-6 shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 w-full sm:w-auto sm:min-w-[160px]"
                            onClick={onSaveAndInviteAll}
                            disabled={isSaving || data.length === 0}
                        >
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save and Invite User(s)"}
                        </Button>
                    )}
                </div>
            </div>

        </>
    );
}
