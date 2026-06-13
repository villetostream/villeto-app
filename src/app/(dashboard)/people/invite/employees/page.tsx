
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
                    <div className="bg-white rounded-lg border p-6">
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-60" />
                            <Skeleton className="h-4 w-80" />
                            <div className="mt-6 space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-14 w-full rounded-md" />
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

        // Empty directory state — "Populate Directory" CTA
        return (
            <div className="p-4 max-w-7xl mx-auto">
                <div className="bg-white rounded-lg border">
                    <div className="flex items-center justify-between p-6 pb-2">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Invite Employees from Directory</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Select people to invite to Villeto as users.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center py-24 px-6">
                        <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13l-3-3m0 0l-3 3m3-3v6" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Organization Directory is Empty</h3>
                        <p className="text-gray-500 text-sm mb-6 text-center max-w-md">
                            You haven&apos;t uploaded your directory yet. Do that and invite your employees from it.
                        </p>
                        <button
                            onClick={() => {
                                // Track that we came from the empty-directory state
                                sessionStorage.setItem("uploadDirReferrer", "empty-directory");
                                setReferrer("empty-directory");
                                router.replace("/people/invite/employees?step=upload");
                            }}
                            className="inline-flex items-center gap-2 bg-[#00BFA5] hover:bg-[#00BFA5]/90 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
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
            <div className={`bg-white rounded-lg shadow-sm border p-4 ${step === "preview" ? "h-[calc(100vh_-_140px)]" : "min-h-[350px]"}`}>
                {step === "upload" ? (
                    <div className="max-w-6xl mx-auto mt-2">
                        <EmployeeInviteFileUpload onFileSelect={handleFileSelect} />

                        <h3 className="font-semibold mt-4 border-t border-gray-200 pt-4">Required CSV Columns</h3>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                                <h3 className="font-semibold mb-1 font-mono text-sm">employee_external_id</h3>
                                <p className="text-xs text-gray-500">Unique ID for the employee</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1 font-mono text-sm">first_name</h3>
                                <p className="text-xs text-gray-500">Employee&apos;s first name</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1 font-mono text-sm">last_name</h3>
                                <p className="text-xs text-gray-500">Employee&apos;s last name</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1 font-mono text-sm">email</h3>
                                <p className="text-xs text-gray-500">Corporate email address</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1 font-mono text-sm">job_title</h3>
                                <p className="text-xs text-gray-500">Employee&apos;s job title</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1 font-mono text-sm">department_name</h3>
                                <p className="text-xs text-gray-500">Department or team name</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1 font-mono text-sm">department_external_id</h3>
                                <p className="text-xs text-gray-500">Unique ID for the department</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1 font-mono text-sm">manager_id</h3>
                                <p className="text-xs text-gray-500">employee_external_id of the manager</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1 font-mono text-sm">role_name</h3>
                                <p className="text-xs text-gray-500">Employee role (e.g. Employee, Manager, Finance Admin)</p>
                            </div>
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
