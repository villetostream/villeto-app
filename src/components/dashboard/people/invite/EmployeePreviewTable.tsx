
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
                <div className="flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-semibold">Preview</h2>
                        <p className="text-sm text-gray-500">
                            {totalItems} employee(s) loaded — review before saving
                        </p>
                    </div>
                    <Button variant="outline" onClick={onUploadDifferent} disabled={isSaving}>
                        Upload a different file
                    </Button>
                </div>

                {/* Table */}
                <div className="border rounded-lg flex-1 overflow-hidden relative">
                    <div className="absolute inset-0 overflow-auto">
                        <Table>
                            <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="font-semibold">employee_external_id</TableHead>
                                    <TableHead className="font-semibold">first_name</TableHead>
                                    <TableHead className="font-semibold">last_name</TableHead>
                                    <TableHead className="font-semibold">email</TableHead>
                                    <TableHead className="font-semibold">job_title</TableHead>
                                    <TableHead className="font-semibold">department_name</TableHead>
                                    <TableHead className="font-semibold">department_external_id</TableHead>
                                    <TableHead className="font-semibold">manager_id</TableHead>
                                    <TableHead className="font-semibold">role_name</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center text-gray-400 py-12">
                                            No employees to preview.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((employee) => (
                                        <TableRow key={employee.id}>
                                            <TableCell>{employee.employee_external_id || "—"}</TableCell>
                                            <TableCell className="font-medium">{employee.first_name || "—"}</TableCell>
                                            <TableCell className="font-medium">{employee.last_name || "—"}</TableCell>
                                            <TableCell className="text-gray-500">{employee.email || "—"}</TableCell>
                                            <TableCell>{employee.job_title || "—"}</TableCell>
                                            <TableCell>{employee.department_name || "—"}</TableCell>
                                            <TableCell>{employee.department_external_id || "—"}</TableCell>
                                            <TableCell>{employee.manager_id || "—"}</TableCell>
                                            <TableCell>{employee.role_name || "—"}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
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

                {/* Pagination — same style as DataTable */}
                {totalItems > 0 && (
                    <div className="flex md:flex-row items-center justify-between bg-gray-50 py-2 px-4 border-t w-full flex-shrink-0">
                        <div className="flex items-center gap-2 w-full sm:w-auto mb-2 md:mb-0">
                            <span className="text-sm text-gray-700 whitespace-nowrap">
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
                                <SelectTrigger className="w-fit min-w-[80px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex w-full md:w-auto justify-end gap-2">
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
                <div className="flex justify-end gap-3 pt-2 flex-shrink-0">
                    <Button
                        variant={saveOnlyMode ? "default" : "outline"}
                        className={saveOnlyMode ? "bg-primary hover:bg-primary/90 text-white min-w-[160px]" : "border-primary text-primary hover:bg-primary/5 hover:text-primary min-w-[160px]"}
                        onClick={onSaveToDirectory}
                        disabled={isSaving || data.length === 0}
                        data-tour="save-to-directory-button"
                    >
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save to Directory"}
                    </Button>
                    {!saveOnlyMode && (
                        <Button
                            className="bg-primary hover:bg-primary/90 min-w-[160px]"
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
                <DialogContent className="sm:max-w-[400px] p-6 bg-white rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-gray-900">Remove Employee</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500 mt-2">
                            Remove <span className="font-medium text-gray-700">{deleteModal.name}</span> from the preview list? This does not delete them from the system.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-3 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteModal({ open: false, id: "", name: "" })}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            className="flex-1"
                        >
                            Remove
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
