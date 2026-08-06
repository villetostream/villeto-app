
"use client";

import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import EmployeeInviteFileUpload from "@/components/dashboard/people/invite/EmployeeInviteFileUpload";
import EmployeePreviewTable, { EmployeeData } from "@/components/dashboard/people/invite/EmployeePreviewTable";
import { OrganizationDirectoryPage } from "@/components/dashboard/people/directory/OrganizationDirectoryPage";
import { useRouter, useSearchParams } from "next/navigation";
import { useBulkImportApi } from "@/queries/users/bulk-import";
import { notifySetupGuide } from "@/lib/setupGuideEvents";
import { useGetDirectoryUsersApi } from "@/queries/users/get-all-users";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { Skeleton } from "@/components/ui/skeleton";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload04Icon } from "@hugeicons/core-free-icons";

type Step = "directory" | "upload" | "preview";

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

    const bulkImportMutation = useBulkImportApi();
    const usersApi = useGetDirectoryUsersApi();

    const directoryTotalCount = usersApi?.data?.meta?.totalCount ?? 0;
    // Empty if <= 1 (threshold updated from > 2)
    const hasDirectoryData = directoryTotalCount > 1;

    // Parse CSV locally without calling any API
    const handleFileSelect = useCallback((file: File) => {
        setRawFile(file);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as Record<string, string>[];

                const mapped: EmployeeData[] = rows.map((row, i) => ({
                    id: `preview-${i}`,
                    employee_external_id: row["employee_external_id"] ?? "",
                    first_name: row["first_name"] ?? "",
                    last_name: row["last_name"] ?? "",
                    email: row["email"] ?? "",
                    job_title: row["job_title"] ?? "",
                    department_name: row["department_name"] ?? "",
                    department_external_id: row["department_external_id"] ?? "",
                    manager_id: row["manager_id"] ?? "",
                    role_name: row["role_name"] ?? "",
                }));

                if (mapped.length === 0) {
                    toast.error("No data found in the file. Please check the CSV format.");
                    return;
                }

                setEmployeeData(mapped);
                router.replace("/people/invite/employees?step=preview");
                toast.success(`${mapped.length} employee(s) loaded from file.`);
            },
            error: () => {
                toast.error("Failed to parse file. Please ensure it is a valid CSV.");
            },
        });
    }, [router]);

    const handleDataChange = (newData: EmployeeData[]) => {
        setEmployeeData(newData);
    };

    // Delete is local only — just removes from preview state
    const handleDelete = (id: string) => {
        setEmployeeData((prev) => prev.filter((item) => item.id !== id));
        toast.success("Employee removed from preview.");
    };

    const handleUploadDifferent = () => {
        setEmployeeData([]);
        setRawFile(null);
        router.replace("/people/invite/employees?step=upload");
    };

    const generateCsvFile = (): File | null => {
        if (!rawFile || employeeData.length === 0) return null;

        const dataToUnparse = employeeData.map(emp => ({
            "employee_external_id": emp.employee_external_id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "email": emp.email,
            "job_title": emp.job_title,
            "department_name": emp.department_name,
            "department_external_id": emp.department_external_id,
            "manager_id": emp.manager_id,
            "role_name": emp.role_name,
        }));

        const csvString = Papa.unparse(dataToUnparse);
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        return new File([blob], rawFile.name || "directory.csv", { type: "text/csv" });
    };

    // POST to API then navigate based on where the user came from
    const handleSaveToDirectory = async () => {
        const fileToUpload = generateCsvFile();
        if (!fileToUpload) return;
        try {
            await bulkImportMutation.mutateAsync(fileToUpload);
            toast.success("Directory saved successfully!");
            notifySetupGuide("directory");

            const currentReferrer = referrer;
            clearReferrer();

            if (currentReferrer === "leadership") {
                // Came from leadership page's "upload user to directory" link
                router.push("/people/invite/leadership");
            } else if (referrer === "empty-directory") {
                // Came from the empty-directory "Populate Directory" button
                // Refresh the directory data and go back to directory selection
                setJustUploaded(true);
                await usersApi.refetch();
                router.replace("/people/invite/employees");
            } else {
                // Default: came from the Directory tab header "Upload Directory"
                router.push("/people?tab=directory");
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "Failed to save directory. Please try again."));
        }
    };

    const handleSaveAndInviteAll = async () => {
        const fileToUpload = generateCsvFile();
        if (!fileToUpload) return;
        try {
            await bulkImportMutation.mutateAsync(fileToUpload);
            toast.success("Directory saved! Select users to invite.");
            notifySetupGuide("directory");
            notifySetupGuide("invitations");
            // Mark that we just uploaded so the directory step renders
            // OrganizationDirectoryPage immediately without waiting for the
            // API count to refresh.
            setJustUploaded(true);
            await usersApi.refetch();
            router.replace("/people/invite/employees");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "Failed to save directory. Please try again."));
        }
    };

    // Determine if preview should show save-only mode
    // (no "Save and Invite Users" button — only "Save to Directory")
    const isSaveOnlyMode =
        referrer === "leadership" ||
        referrer === "empty-directory" ||
        referrer === "directory";

    // Directory step
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

    return (
        <div className="p-4 max-w-7xl mx-auto overflow-y-auto" style={{ maxHeight: "100%" }}>
            <div className={`bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_16px_rgba(14,28,23,0.04)] p-5 ${step === "preview" ? "h-[calc(100vh_-_140px)]" : "min-h-[350px]"}`}>
                {step === "upload" ? (
                    <div className="max-w-6xl mx-auto mt-2">
                        <EmployeeInviteFileUpload onFileSelect={handleFileSelect} />

                        <h3 className="text-[13px] font-semibold text-[#202723] uppercase tracking-[0.06em] mt-6 border-t border-black/[0.06] pt-5 mb-4">Required CSV Columns</h3>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { key: "employee_external_id", desc: "Unique ID for the employee" },
                                { key: "first_name", desc: "Employee's first name" },
                                { key: "last_name", desc: "Employee's last name" },
                                { key: "email", desc: "Corporate email address" },
                                { key: "job_title", desc: "Employee's job title" },
                                { key: "department_name", desc: "Department or team name" },
                                { key: "department_external_id", desc: "Unique ID for the department" },
                                { key: "manager_id", desc: "employee_external_id of the manager" },
                                { key: "role_name", desc: "Employee role (e.g. Employee, Manager, Finance Admin)" },
                            ].map(({ key, desc }) => (
                                <div key={key} className="bg-[#f9faf9] rounded-[10px] px-4 py-3 border border-black/[0.06]">
                                    <p className="font-mono text-[12px] font-semibold text-[#087f70]">{key}</p>
                                    <p className="text-[12px] text-[#66706b] mt-0.5">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <EmployeePreviewTable
                        data={employeeData}
                        onDataChange={handleDataChange}
                        onDelete={handleDelete}
                        onUploadDifferent={handleUploadDifferent}
                        onSaveToDirectory={handleSaveToDirectory}
                        onSaveAndInviteAll={handleSaveAndInviteAll}
                        isSaving={bulkImportMutation.isPending}
                        saveOnlyMode={isSaveOnlyMode}
                    />
                )}
            </div>
        </div>
    );
}
