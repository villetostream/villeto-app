
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
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
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

export interface EmployeeData {
    id: string;
    employee_external_id: string;
    first_name: string;
    last_name: string;
    email: string;
    job_title: string;
    department_name: string;
    department_external_id: string;
    manager_id: string;
    role_name: string;
}

interface EmployeePreviewTableProps {
    data: EmployeeData[];
    onDataChange: (data: EmployeeData[]) => void;
    onDelete: (id: string) => void;
    onUploadDifferent: () => void;
    onSaveToDirectory: () => void;
    onSaveAndInviteAll: () => void;
    isSaving?: boolean;
    saveOnlyMode?: boolean;
}

const PAGE_SIZE_OPTIONS = [
    { label: "5", value: "5" },
    { label: "10", value: "10" },
    { label: "20", value: "20" },
    { label: "50", value: "50" },
    { label: "100", value: "100" },
];

export default function EmployeePreviewTable({
    data,
    onDataChange: _onDataChange,
    onDelete,
    onUploadDifferent,
    onSaveToDirectory,
    onSaveAndInviteAll,
    isSaving = false,
    saveOnlyMode = false,
}: EmployeePreviewTableProps) {
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({
        open: false,
        id: "",
        name: "",
    });

    const totalItems = data.length;

    const tableProps = useDataTable({
        initialPage: 1,
        initialPageSize: 10,
        totalItems,
        manualPagination: false,
    });
    const { paginationProps } = tableProps;

    const pageSize = paginationProps.pageSize;
    const currentPage = paginationProps.page;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedData = data.slice(startIndex, endIndex);

    const handleDeleteClick = (id: string, name: string) => {
        setDeleteModal({ open: true, id, name });
    };

    const handleConfirmDelete = () => {
        onDelete(deleteModal.id);
        setDeleteModal({ open: false, id: "", name: "" });
        // Go back a page if the last item on this page was deleted
        if (paginatedData.length === 1 && currentPage > 1) {
            paginationProps.setPage(currentPage - 1);
        }
    };

    const getPageNumbers = (current: number, total: number) => {
        const delta = 2;
        const pages: number[] = [];
        for (
            let i = Math.max(1, current - delta);
            i <= Math.min(total, current + delta);
            i++
        ) {
            pages.push(i);
        }
        return pages;
    };

    const pageNumbers = getPageNumbers(currentPage, totalPages);

    return (
        <>
            <div className="flex flex-col h-full space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 flex-shrink-0">
                    <div>
                        <h2 className="text-[16px] font-semibold text-[#0b100e]">Preview Directory</h2>
                        <p className="text-[13px] text-[#66706b] mt-0.5">
                            {totalItems} employee(s) loaded — review before saving
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

                {/* Table */}
                <div className="border border-black/[0.08] rounded-[12px] flex-1 overflow-hidden relative bg-white">
                    <div className="absolute inset-0 overflow-auto w-full">
                        <Table className="min-w-max w-full">
                            <TableHeader className="bg-[#f9faf9] sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="font-semibold text-[11px] text-[#84908a] uppercase tracking-[0.06em] h-10">employee_external_id</TableHead>
                                    <TableHead className="font-semibold text-[11px] text-[#84908a] uppercase tracking-[0.06em] h-10">first_name</TableHead>
                                    <TableHead className="font-semibold text-[11px] text-[#84908a] uppercase tracking-[0.06em] h-10">last_name</TableHead>
                                    <TableHead className="font-semibold text-[11px] text-[#84908a] uppercase tracking-[0.06em] h-10">email</TableHead>
                                    <TableHead className="font-semibold text-[11px] text-[#84908a] uppercase tracking-[0.06em] h-10">job_title</TableHead>
                                    <TableHead className="font-semibold text-[11px] text-[#84908a] uppercase tracking-[0.06em] h-10">department_name</TableHead>
                                    <TableHead className="font-semibold text-[11px] text-[#84908a] uppercase tracking-[0.06em] h-10">department_external_id</TableHead>
                                    <TableHead className="font-semibold text-[11px] text-[#84908a] uppercase tracking-[0.06em] h-10">manager_id</TableHead>
                                    <TableHead className="font-semibold text-[11px] text-[#84908a] uppercase tracking-[0.06em] h-10">role_name</TableHead>
                                    <TableHead className="w-[50px] h-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center text-[#84908a] text-[13px] py-12">
                                            No employees to preview.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((employee) => (
                                        <TableRow key={employee.id} className="border-b border-black/[0.04] hover:bg-[#f5f7f6] transition-colors text-[13px]">
                                            <TableCell className="text-[#66706b]">{employee.employee_external_id || "—"}</TableCell>
                                            <TableCell className="font-semibold text-[#0b100e]">{employee.first_name || "—"}</TableCell>
                                            <TableCell className="font-semibold text-[#0b100e]">{employee.last_name || "—"}</TableCell>
                                            <TableCell className="text-[#66706b]">{employee.email || "—"}</TableCell>
                                            <TableCell className="text-[#0b100e]">{employee.job_title || "—"}</TableCell>
                                            <TableCell className="text-[#0b100e]">{employee.department_name || "—"}</TableCell>
                                            <TableCell className="text-[#66706b]">{employee.department_external_id || "—"}</TableCell>
                                            <TableCell className="text-[#66706b]">{employee.manager_id || "—"}</TableCell>
                                            <TableCell className="text-[#0b100e]">{employee.role_name || "—"}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-[#84908a] hover:text-red-500 hover:bg-red-50 rounded-[8px] transition-colors"
                                                    onClick={() => handleDeleteClick(employee.id, `${employee.first_name} ${employee.last_name}`.trim() || employee.email)}
                                                    disabled={isSaving}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Pagination */}
                {totalItems > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between bg-[#f9faf9] py-3 px-4 border border-black/[0.08] rounded-[12px] w-full flex-shrink-0 gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span className="text-[12px] text-[#66706b] font-medium whitespace-nowrap">
                                {totalItems > 0 ? (
                                    <>
                                        Showing {startIndex + 1}-{endIndex} of {totalItems} entries
                                    </>
                                ) : (
                                    <>Showing 0 of 0 entries</>
                                )}
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
                                    {PAGE_SIZE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value} className="text-[12px]">
                                            {option.label}
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
                                            onClick={(e) => {
                                                e.preventDefault();
                                                paginationProps.setPage(Math.max(1, currentPage - 1));
                                            }}
                                            href="#"
                                            isDisabled={currentPage === 1}
                                            isActive={currentPage > 1}
                                            size={"sm"}
                                        />
                                    </PaginationItem>

                                    {/* First page + Ellipsis */}
                                    {pageNumbers[0] > 1 && (
                                        <>
                                            <PaginationItem>
                                                <PaginationLink
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        paginationProps.setPage(1);
                                                    }}
                                                    href="#"
                                                    isActive={1 === currentPage}
                                                    size={"sm"}
                                                >
                                                    1
                                                </PaginationLink>
                                            </PaginationItem>
                                            {pageNumbers[0] > 2 && (
                                                <PaginationItem>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            )}
                                        </>
                                    )}

                                    <div className="hidden md:flex">
                                        {pageNumbers.map((page) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    className={`${currentPage !== page ? "text-muted-foreground" : ""}`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        paginationProps.setPage(page);
                                                    }}
                                                    href="#"
                                                    isActive={page === currentPage}
                                                    size={"sm"}
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}

                                        {/* Ellipsis + Last page */}
                                        {pageNumbers[pageNumbers.length - 1] < totalPages && (
                                            <>
                                                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                                                    <PaginationItem>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                )}
                                                <PaginationItem>
                                                    <PaginationLink
                                                        href="#"
                                                        size="sm"
                                                        isActive={totalPages === currentPage}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            paginationProps.setPage(totalPages);
                                                        }}
                                                    >
                                                        {totalPages}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            </>
                                        )}
                                    </div>

                                    <div className="md:hidden block">
                                        <PaginationItem>
                                            <PaginationLink isActive size="sm" href={""}>
                                                {currentPage}
                                            </PaginationLink>
                                        </PaginationItem>
                                    </div>

                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={(e) => {
                                                e.preventDefault();
                                                paginationProps.setPage(currentPage + 1);
                                            }}
                                            href="#"
                                            size={"sm"}
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

            {/* Delete confirmation modal */}
            <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, id: "", name: "" })}>
                <DialogContent className="sm:max-w-[400px] p-6 bg-white rounded-2xl border-none shadow-xl gap-0">
                    <DialogHeader className="mb-5 text-left">
                        <DialogTitle className="text-[18px] font-semibold text-[#0b100e]">Remove Employee</DialogTitle>
                        <DialogDescription className="text-[13px] text-[#66706b] mt-2">
                            Remove <span className="font-semibold text-[#0b100e]">{deleteModal.name}</span> from the preview list? This does not delete them from the system.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteModal({ open: false, id: "", name: "" })}
                            className="flex-1 h-[44px] rounded-[10px] border-black/[0.1] text-[#303834] hover:bg-[#f5f7f6] text-[13px] font-semibold"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            className="flex-1 h-[44px] rounded-[10px] bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold shadow-[0_8px_20px_-10px_rgba(239,68,68,0.7)] hover:translate-y-[-1px] transition-all"
                        >
                            Remove
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
