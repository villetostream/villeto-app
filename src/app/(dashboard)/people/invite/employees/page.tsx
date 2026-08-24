
"use client";

import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import EmployeeInviteFileUpload from "@/components/dashboard/people/invite/EmployeeInviteFileUpload";
import EmployeePreviewTable, { EmployeeData } from "@/components/dashboard/people/invite/EmployeePreviewTable";
import { OrganizationDirectoryPage } from "@/components/dashboard/people/directory/OrganizationDirectoryPage";
import { useRouter, useSearchParams } from "next/navigation";
import { useBulkImportApi } from "@/queries/users/bulk-import";
import { useBulkValidateApi, ValidationResult } from "@/queries/users/bulk-validate";
import { notifySetupGuide } from "@/lib/setupGuideEvents";
import { useGetDirectoryUsersApi } from "@/queries/users/get-all-users";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload04Icon } from "@hugeicons/core-free-icons";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import ValidationSummaryModal from "@/components/dashboard/people/import/ValidationSummaryModal";
import ReviewImportIssues from "@/components/dashboard/people/import/ReviewImportIssues";

type Step = "directory" | "upload" | "preview" | "review";
type DuplicateStrategy = "skip_existing" | "update_existing";

/**
 * Reads the upload referrer from sessionStorage.
 * - "leadership"      → came from the leadership page's "upload user to directory" link
 * - "empty-directory" → came from the empty-directory "Populate Directory" button
 * - "directory"       → came from the Directory tab header "Upload Directory" button
 * - null / anything else → default behaviour
 */
function getReferrer(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("uploadDirReferrer");
}

function clearReferrer() {
    if (typeof window !== "undefined") sessionStorage.removeItem("uploadDirReferrer");
}

export default function InviteEmployeesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const step = (searchParams.get("step") as Step) || "directory";

    const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
    const [rawFile, setRawFile] = useState<File | null>(null);

    // True immediately after a successful bulk-import upload so we skip the
    // stale directoryTotalCount check and always show the directory picker.
    const [justUploaded, setJustUploaded] = useState(false);
    const [referrer, setReferrer] = useState<string | null>(() => getReferrer());

    // Validation state
    const [validationModalOpen, setValidationModalOpen] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    const bulkImportMutation = useBulkImportApi();
    const bulkValidateMutation = useBulkValidateApi();
    const usersApi = useGetDirectoryUsersApi({ params: { status: "all" } });
    const axiosInstance = useAxios();

    const directoryTotalCount = usersApi?.data?.meta?.totalCount ?? 0;
    // Empty if <= 1 (threshold updated from > 2)
    const hasDirectoryData = directoryTotalCount > 1;

    const handleDownloadTemplate = async (format: "csv" | "xlsx", mode: "blank" | "current_directory" = "blank") => {
        try {
            const toastId = toast.loading(`Downloading ${format.toUpperCase()} template...`);
            const res = await axiosInstance.get(API_KEYS.COMPANY.BULK_IMPORT_TEMPLATE(format, mode), {
                responseType: "blob",
            });
            const blob = new Blob([res.data], { type: res.headers["content-type"] as string | undefined });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = mode === "current_directory" ? `employee-directory.${format}` : `employee-import-template.${format}`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.dismiss(toastId);
        } catch {
            toast.dismiss();
            toast.error("Failed to download template.");
        }
    };

    const handleFileSelect = useCallback((file: File) => {
        setRawFile(file);
        setValidationResult(null);

        const mapRows = (rows: Record<string, any>[]) => {
            const mapped: EmployeeData[] = rows.map((row, i) => ({
                id: `preview-${i}`,
                employee_external_id: row["employee_external_id"] ?? "",
                first_name: row["first_name"] ?? "",
                last_name: row["last_name"] ?? "",
                email: row["email"] ?? "",
                manager_external_id: row["manager_external_id"] ?? "",
                department_name: row["department_name"] ?? "",
                department_external_id: row["department_external_id"] ?? "",
                job_title: row["job_title"] ?? "",
                management_level: row["management_level"] ?? "",
                job_grade: row["job_grade"] ?? "",
                business_unit: row["business_unit"] ?? "",
                location: row["location"] ?? "",
                employment_type: row["employment_type"] ?? "",
                status: row["status"] ?? "",
                effective_date: row["effective_date"] ?? "",
            }));

            if (mapped.length === 0) {
                toast.error("No data found in the file.");
                return;
            }

            setEmployeeData(mapped);
            router.replace("/people/invite/employees?step=preview");
            toast.success(`${mapped.length} employee(s) loaded from file.`);
        };

        const fileName = file.name.toLowerCase();
        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: "array" });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, any>[];
                    mapRows(rows);
                } catch {
                    toast.error("Failed to parse Excel file.");
                }
            };
            reader.onerror = () => toast.error("Failed to read file.");
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => mapRows(results.data as Record<string, string>[]),
                error: () => toast.error("Failed to parse file. Please ensure it is a valid CSV."),
            });
        }
    }, [router]);

    const handleDataChange = (newData: EmployeeData[]) => {
        setEmployeeData(newData);
    };

    const handleUploadDifferent = () => {
        setEmployeeData([]);
        setRawFile(null);
        setValidationResult(null);
        router.replace("/people/invite/employees?step=upload");
    };

    // ─── Validation → Import Flow ────────────────────────────────────────────

    /**
     * Step 1: Called when user clicks "Save to Directory" on the preview table.
     * Sends the raw original file to the validate endpoint.
     */
    const handleSaveToDirectory = async () => {
        if (!rawFile) return;

        setValidationModalOpen(true);
        setValidationResult(null);

        try {
            const res = await bulkValidateMutation.mutateAsync({ file: rawFile });
            const result = res.data;
            setValidationResult(result);

            // If fully valid with no issues at all, we can auto-proceed
            if (result.valid && result.summary.errorRows === 0 && result.summary.warningRows === 0) {
                // still show the modal briefly so user sees the green summary
            }
        } catch (error: unknown) {
            setValidationModalOpen(false);
            toast.error(getApiErrorMessage(error, "Failed to validate file. Please try again."));
        }
    };

    /**
     * Step 2a: Validation passed — proceed directly to import.
     */
    const handleProceedToImport = async (strategy?: DuplicateStrategy) => {
        if (!rawFile) return;
        setValidationModalOpen(false);
        await executeImport(strategy);
    };

    /**
     * Step 2b: Validation had issues — navigate to the review screen.
     */
    const handleReviewIssues = () => {
        setValidationModalOpen(false);
        router.replace("/people/invite/employees?step=review");
    };

    /**
     * Final import call — sends the raw original file unmodified.
     */
    const executeImport = async (strategy?: DuplicateStrategy) => {
        if (!rawFile) return;

        try {
            await bulkImportMutation.mutateAsync({ file: rawFile, duplicateStrategy: strategy });
            toast.success("Directory saved successfully!");
            notifySetupGuide("directory");

            const currentReferrer = referrer;
            clearReferrer();

            if (currentReferrer === "leadership") {
                router.push("/people/invite/leadership");
            } else if (currentReferrer === "empty-directory") {
                setJustUploaded(true);
                await usersApi.refetch();
                router.replace("/people/invite/employees");
            } else {
                router.push("/people?tab=directory");
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "Failed to save directory. Please try again."));
        }
    };

    const handleSaveAndInviteAll = async () => {
        if (!rawFile) return;
        setValidationModalOpen(true);
        setValidationResult(null);

        try {
            const res = await bulkValidateMutation.mutateAsync({ file: rawFile });
            const result = res.data;
            setValidationResult(result);
        } catch (error: unknown) {
            setValidationModalOpen(false);
            toast.error(getApiErrorMessage(error, "Failed to validate file. Please try again."));
        }
    };

    // Determine if preview should show save-only mode
    const isSaveOnlyMode =
        referrer === "leadership" ||
        referrer === "empty-directory" ||
        referrer === "directory";

    // ─── Directory step ───────────────────────────────────────────────────────
    if (step === "directory") {
        if (usersApi.isLoading) {
            return (
                <div className="p-4 max-w-7xl mx-auto">
                    <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_16px_rgba(14,28,23,0.04)] p-6">
                        <div className="space-y-4">
                            <div className="h-5 w-48 animate-pulse rounded-[8px] bg-[#f0f2f1]" />
                            <div className="h-4 w-72 animate-pulse rounded-[8px] bg-[#f0f2f1]" />
                            <div className="mt-6 space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-12 w-full animate-pulse rounded-[10px] bg-[#f0f2f1]" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (hasDirectoryData || justUploaded) {
            return (
                <div className="p-4 max-w-7xl mx-auto h-full overflow-hidden">
                    <OrganizationDirectoryPage
                        onBack={() => {
                            setJustUploaded(false);
                            router.push("/people?tab=directory");
                        }}
                    />
                </div>
            );
        }

        // Empty directory state
        return (
            <div className="p-4 max-w-7xl mx-auto">
                <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_16px_rgba(14,28,23,0.04)]">
                    <div className="flex items-center justify-between px-6 pt-6 pb-2">
                        <div>
                            <h2 className="text-[16px] font-semibold text-[#0b100e]">Invite Employees from Directory</h2>
                            <p className="text-[13px] text-[#66706b] mt-0.5">
                                Select people to invite to Villeto as users.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                        <div className="w-16 h-16 bg-[#e7f6f2] rounded-[14px] flex items-center justify-center mb-5">
                            <svg className="w-7 h-7 text-[#087f70]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13l-3-3m0 0l-3 3m3-3v6" />
                            </svg>
                        </div>
                        <h3 className="text-[17px] font-semibold text-[#0b100e] mb-2">Organisation Directory is Empty</h3>
                        <p className="text-[13px] text-[#66706b] mb-7 text-center max-w-sm leading-relaxed">
                            You haven&apos;t uploaded your directory yet. Upload it and invite your employees from there.
                        </p>
                        <button
                            onClick={() => {
                                sessionStorage.setItem("uploadDirReferrer", "empty-directory");
                                setReferrer("empty-directory");
                                router.replace("/people/invite/employees?step=upload");
                            }}
                            className="inline-flex items-center gap-2 h-[46px] bg-[#0ea894] hover:bg-[#0c9785] text-white px-6 rounded-[10px] font-semibold text-[13px] shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all"
                        >
                            <HugeiconsIcon icon={Upload04Icon} className="w-4 h-4" />
                            Populate Directory
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Review Issues step ───────────────────────────────────────────────────
    if (step === "review") {
        return (
            <div className="p-4 max-w-7xl mx-auto overflow-y-auto" style={{ maxHeight: "100%" }}>
                <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_16px_rgba(14,28,23,0.04)] p-5 h-[calc(100vh_-_140px)]">
                    {validationResult ? (
                        <ReviewImportIssues
                            validationResult={validationResult}
                            previewData={employeeData}
                            isSaving={bulkImportMutation.isPending}
                            onUploadDifferent={handleUploadDifferent}
                            onContinueToImport={(strategy) => executeImport(strategy)}
                        />
                    ) : (
                        // If user navigated here with no validation result (e.g., refreshed)
                        <div className="flex flex-col items-center justify-center h-full text-center text-[#84908a]">
                            <p className="text-[15px] font-semibold text-[#0b100e] mb-2">No validation data found</p>
                            <p className="text-[13px] mb-5">Please go back and validate your file first.</p>
                            <button
                                onClick={handleUploadDifferent}
                                className="inline-flex items-center gap-2 h-[42px] border border-black/[0.1] text-[#303834] px-5 rounded-[10px] font-semibold text-[13px] hover:bg-[#f5f7f6] transition-colors"
                            >
                                Upload a file
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─── Upload & Preview steps ───────────────────────────────────────────────
    return (
        <>
            {/* Validation summary modal */}
            <ValidationSummaryModal
                open={validationModalOpen}
                result={validationResult}
                isLoading={bulkValidateMutation.isPending}
                onCancel={() => setValidationModalOpen(false)}
                onReviewIssues={handleReviewIssues}
                onProceedToImport={() => handleProceedToImport(undefined)}
            />

            <div className="p-4 max-w-7xl mx-auto overflow-y-auto" style={{ maxHeight: "100%" }}>
                <div className={`bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_16px_rgba(14,28,23,0.04)] p-5 ${step === "preview" ? "h-[calc(100vh_-_140px)]" : "min-h-[350px]"}`}>
                    {step === "upload" ? (
                        <div className="max-w-6xl mx-auto mt-2">
                            <EmployeeInviteFileUpload
                                onFileSelect={handleFileSelect}
                                onDownloadTemplate={handleDownloadTemplate}
                            />

                            <h3 className="text-[13px] font-semibold text-[#202723] uppercase tracking-[0.06em] mt-6 border-t border-black/[0.06] pt-5 mb-4">Template Columns Overview</h3>

                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { key: "first_name",             desc: "Employee's first name (Required)",            req: true },
                                    { key: "last_name",              desc: "Employee's last name (Required)",             req: true },
                                    { key: "email",                  desc: "Corporate email address (Required)",          req: true },
                                    { key: "employee_external_id",   desc: "Unique ID for the employee",                  req: true },
                                    { key: "manager_external_id",    desc: "Employee ID of the manager",                  req: true },
                                    { key: "department_name",        desc: "Department or team name",                     req: true },
                                    { key: "department_external_id", desc: "Unique ID for the department",                req: true },
                                    { key: "job_title",              desc: "Employee's job title",                        req: true },
                                    { key: "management_level",       desc: "e.g., Executive (Req. if no Job Grade)",      req: true },
                                    { key: "job_grade",              desc: "e.g., E1, E2 (Req. if no Mgmt Level)",        req: true },
                                    { key: "business_unit",          desc: "Business unit or division",                   req: false },
                                    { key: "location",               desc: "Employee's primary location",                 req: false },
                                    { key: "employment_type",        desc: "e.g., Full-Time, Part-Time",                  req: false },
                                    { key: "status",                 desc: "Active, Pending, Inactive",                   req: false },
                                    { key: "effective_date",         desc: "Start or role effective date",                req: false },
                                ].map(({ key, desc, req }) => (
                                    <div key={key} className="bg-[#f9faf9] rounded-[10px] px-4 py-3 border border-black/[0.06] flex flex-col justify-between">
                                        <div>
                                            <p className={`font-mono text-[12px] font-semibold ${req ? "text-[#087f70]" : "text-[#84908a]"}`}>
                                                {key} {req && "*"}
                                            </p>
                                            <p className="text-[12px] text-[#66706b] mt-0.5">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <EmployeePreviewTable
                            data={employeeData}
                            onDataChange={handleDataChange}
                            onUploadDifferent={handleUploadDifferent}
                            onSaveToDirectory={handleSaveToDirectory}
                            onSaveAndInviteAll={handleSaveAndInviteAll}
                            isSaving={bulkImportMutation.isPending || bulkValidateMutation.isPending}
                            saveOnlyMode={isSaveOnlyMode}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
