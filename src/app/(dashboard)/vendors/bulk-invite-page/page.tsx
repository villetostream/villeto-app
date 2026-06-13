"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Loader2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface VendorRow {
  id: string;
  type: string;
  vendorName: string;
  email: string;
  category: string;
}

const PAGE_SIZE_OPTIONS = [
    { label: "5", value: "5" },
    { label: "10", value: "10" },
    { label: "20", value: "20" },
    { label: "50", value: "50" },
    { label: "100", value: "100" },
];

// ─── Success Modal ────────────────────────────────────────────────────────────

function SuccessModal({ count, onClose }: { count: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[440px] overflow-hidden p-10 flex flex-col items-center text-center">
        <div className="relative mb-6">
          {[
            "absolute -top-3 -left-4 w-3 h-3 rounded-full bg-amber-400",
            "absolute top-0 right-0 w-2 h-2 rounded-full bg-blue-500",
            "absolute bottom-0 -left-6 w-2 h-2 rounded-full bg-primary",
            "absolute -bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-orange-400",
            "absolute top-4 -right-6 w-1.5 h-1.5 rounded-full bg-green-400",
          ].map((cls, i) => <span key={i} className={cls} />)}
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Vendor Invite{count > 1 ? "s" : ""} Sent</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          The vendor{count > 1 ? "s have" : " has"} received an onboarding link and can now begin verification.
        </p>
        <button
          onClick={onClose}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ─── Required Fields ──────────────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  { name: "Vendor type",    desc: "Select the vendor type" },
  { name: "Vendor Name",    desc: "Business or personal name" },
  { name: "Email Address",  desc: "Vendor email address" },
  { name: "Category",       desc: "Vendor category" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorBulkInvitePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [_file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Pagination hook
  const totalItems = rows.length;
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
  const paginatedData = rows.slice(startIndex, endIndex);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({
      open: false,
      id: "",
      name: "",
  });

  const getPageNumbers = (current: number, total: number) => {
      const delta = 2;
      const pages: number[] = [];
      for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
          pages.push(i);
      }
      return pages;
  };

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  // Parse CSV into preview rows
  const parseFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) return;
      const parsed: VendorRow[] = lines.slice(1).map((line, i) => {
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
        return {
          id: `row-${i}`,
          type:       cols[0] || "Company",
          vendorName: cols[1] || "",
          email:      cols[2] || "",
          category:   cols[3] || "",
        };
      });
      setRows(parsed);
      setSelected(new Set(parsed.map((r) => r.id)));
      setStep("preview");
      paginationProps.setPage(1);
    };
    reader.readAsText(f);
  }, [paginationProps]);

  const handleFileSelect = (f: File) => {
    setFile(f);
    parseFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const handleDeleteClick = (id: string, name: string) => {
      setDeleteModal({ open: true, id, name });
  };

  const handleConfirmDelete = () => {
      setRows((prev) => prev.filter((r) => r.id !== deleteModal.id));
      setSelected((prev) => {
        const s = new Set(prev);
        s.delete(deleteModal.id);
        return s;
      });
      setDeleteModal({ open: false, id: "", name: "" });
      if (paginatedData.length === 1 && currentPage > 1) {
          paginationProps.setPage(currentPage - 1);
      }
  };

  const handleSend = async () => {
    if (selected.size === 0) return;
    setIsSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSending(false);
    setShowSuccess(true);
  };

  return (
    <div className="space-y-0 h-full flex flex-col">
      {showSuccess && (
        <SuccessModal
          count={selected.size}
          onClose={() => { setShowSuccess(false); router.push("/vendors"); }}
        />
      )}

      {/* Upload step */}
      {step === "upload" && (
        <div className="bg-white rounded-2xl border border-border p-8 w-full">
          <h2 className="text-2xl font-bold text-foreground mb-1">Invite Vendors in Bulk</h2>
          <p className="text-sm text-muted-foreground mb-8">Upload a file containing the necessary vendor information.</p>

          <div className="mb-6">
            <div className="flex items-center justify-end mb-3">
              <button className="flex items-center gap-2 text-sm text-primary font-medium hover:opacity-80 transition-opacity">
                <Download className="w-4 h-4" />
                Download a Template
              </button>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed transition-all p-16 flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-muted-foreground">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
              <h4 className="font-semibold text-foreground mb-1">Upload CSV or Excel File</h4>
              <p className="text-sm text-muted-foreground mb-5">Upload a file with user information to invite multiple vendors at once</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="h-10 px-6 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
              >
                Browse File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border p-6">
            <h3 className="text-base font-semibold text-foreground mb-5">Required Fields</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {REQUIRED_FIELDS.map((f) => (
                <div key={f.name}>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview step */}
      {step === "preview" && (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-xl font-semibold">Preview</h2>
                    <p className="text-sm text-gray-500">
                        {totalItems} vendor(s) loaded — review before saving
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => { setStep("upload"); setRows([]); setSelected(new Set()); setFile(null); }} 
                    disabled={isSending}
                >
                    Upload a different file
                </Button>
            </div>

            <div className="border rounded-lg flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-auto bg-white">
                    <Table>
                        <TableHeader className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-12 px-4">
                                    <input
                                      type="checkbox"
                                      checked={selected.size === rows.length && rows.length > 0}
                                      onChange={toggleAll}
                                      className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-[#8B98A6] uppercase text-[11px] tracking-wider py-4">TYPE</TableHead>
                                <TableHead className="font-semibold text-[#8B98A6] uppercase text-[11px] tracking-wider py-4">VENDOR NAME</TableHead>
                                <TableHead className="font-semibold text-[#8B98A6] uppercase text-[11px] tracking-wider py-4">EMAIL</TableHead>
                                <TableHead className="font-semibold text-[#8B98A6] uppercase text-[11px] tracking-wider py-4">CATEGORY</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                                        No vendors to preview.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedData.map((row) => (
                                    <TableRow key={row.id} className={selected.has(row.id) ? "bg-primary/[0.02]" : ""}>
                                        <TableCell className="px-4">
                                            <input
                                              type="checkbox"
                                              checked={selected.has(row.id)}
                                              onChange={() => toggleSelect(row.id)}
                                              className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                                            />
                                        </TableCell>
                                        <TableCell className="text-[#384A57] font-medium">{row.type || "—"}</TableCell>
                                        <TableCell className="text-[#384A57] font-medium">{row.vendorName || "—"}</TableCell>
                                        <TableCell className="text-[#8B98A6]">{row.email || "—"}</TableCell>
                                        <TableCell className="text-[#8B98A6]">{row.category || "—"}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDeleteClick(row.id, row.vendorName || row.email)}
                                                disabled={isSending}
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

            {totalItems > 0 && (
                <div className="flex md:flex-row items-center justify-between bg-gray-50 py-2 px-4 border-t w-full flex-shrink-0 rounded-b-lg -mt-4">
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

            <div className="flex justify-end gap-3 pt-4 flex-shrink-0">
                <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/5 hover:text-primary h-10 px-6 rounded-xl min-w-[160px]"
                    onClick={handleSend}
                    disabled={isSending || selected.size === 0}
                >
                    {isSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save to Directory"}
                </Button>
                <Button
                    className="bg-primary hover:bg-primary/90 h-10 px-6 rounded-xl min-w-[160px]"
                    onClick={handleSend}
                    disabled={isSending || selected.size === 0}
                >
                    {isSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : `Send (${selected.size}) Invite${selected.size !== 1 ? "s" : ""}`}
                </Button>
            </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, id: "", name: "" })}>
          <DialogContent className="sm:max-w-[400px] p-6 bg-white rounded-lg">
              <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-gray-900">Remove Vendor</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-2">
                      Remove <span className="font-medium text-gray-700">{deleteModal.name}</span> from the preview list?
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

    </div>
  );
}