"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FolderX } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload04Icon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDirectoryUsersApi } from "@/queries/users/get-all-users";
import { AppUser } from "@/queries/departments/get-all-departments";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { directoryColumns } from "./directory-columns";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import {
    getUserDepartmentId,
    getUserManagerName,
    getUserRoleId,
    formatDepartmentOptionLabel,
    formatRoleOptionLabel,
    getDepartmentOptionValue,
    toStringFilterRecord,
    unwrapFilterKeys,
} from "../user-table-utils";

// Define getRowId outside the component to ensure referential stability and prevent infinite loops in DataTable
const getRowId = (row: AppUser) => row.userId;

export function DirectoryTab() {
    const tableProps = useDataTable({
        initialPage: 1,
        totalItems: 0, 
        manualSorting: false,
        manualFiltering: true,
        manualPagination: false,
    });

    const page = 1;
    const limit = 1000;

    const filters = tableProps.filterBy || {};
    const status = filters.status && filters.status !== "all" ? (filters.status as string) : "all";
    const employeeStatus = filters.employeeStatus && filters.employeeStatus !== "all" ? (filters.employeeStatus as string) : undefined;
    const roleId = filters.roleId && filters.roleId !== "all" ? (filters.roleId as string) : undefined;
    const departmentId = filters.departmentId && filters.departmentId !== "all" ? (filters.departmentId as string) : undefined;
    const invited = filters.invited && filters.invited !== "all" ? (filters.invited === "true") : undefined;

    const usersApi = useGetDirectoryUsersApi({
        params: {
            page,
            limit,
            status,
            employeeStatus,
            roleId,
            invited,
        }
    });

    const depts = useGetAllDepartmentsApi();
    const roles = useGetAllRolesApi();
    const router = useRouter();

    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(tableProps.globalSearch ?? ""), 200);
        return () => clearTimeout(id);
    }, [tableProps.globalSearch]);

    const users = useMemo(() => {
        let data = usersApi?.data?.data ?? [];
        
        if (departmentId) {
            const selectedDept = depts?.data?.data?.find(d => getDepartmentOptionValue(d) === departmentId);
            data = data.filter((u) => {
                const uDeptId = getUserDepartmentId(u);
                if (uDeptId === departmentId) return true;
                
                if (selectedDept && typeof uDeptId === "string") {
                    const deptName = formatDepartmentOptionLabel(selectedDept);
                    if (uDeptId.toLowerCase() === deptName.toLowerCase()) return true;
                }
                return false;
            });
        }
        
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            data = data.filter((u) => {
                const deptName = typeof u.department === "string" 
                    ? u.department 
                    : (u.department?.name || u.department?.departmentName || "");
                
                return (u.firstName?.toLowerCase() || "").includes(query) ||
                    (u.lastName?.toLowerCase() || "").includes(query) ||
                    (u.email?.toLowerCase() || "").includes(query) ||
                    String(deptName).toLowerCase().includes(query);
            });
        }
        return data;
    }, [usersApi.data?.data, debouncedSearch, departmentId]);

    const totalCount = usersApi?.data?.meta?.totalCount ?? 0;

    const isLoading = usersApi.isLoading;
    useEffect(() => {
        tableProps.setTotalItems(users.length);
    }, [users.length, tableProps.setTotalItems]);

    // Empty state
    if (!isLoading && totalCount === 0 && !tableProps.globalSearch && Object.keys(tableProps.filterBy || {}).length === 0) {
        return (
            <div className="bg-white rounded-lg border">
                {/* Empty content */}
                <div className="flex flex-col items-center justify-center py-24 px-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center mb-6">
                        <FolderX className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Organization Directory is Empty</h3>
                    <p className="text-gray-500 text-sm mb-6 text-center max-w-md">
                        You haven&apos;t upload your directory, do that and invite you employees from it.
                    </p>
                    <Button
                        onClick={() => {
                            sessionStorage.setItem("uploadDirReferrer", "directory");
                            router.push("/people/invite/employees?step=upload");
                        }}
                        className="bg-primary hover:bg-primary/90 gap-2"
                    >
                        <HugeiconsIcon icon={Upload04Icon} className="h-4 w-4" />
                        Upload Directory
                    </Button>
                </div>
            </div>
        );
    }

    // Data state — uses DataTable matching AllUsersTab pattern
    return (
        <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <DataTable
                data={users}
                isLoading={usersApi.isLoading || depts.isLoading || roles.isLoading}
                manualPagination={false}
                emptyState={
                    <EmptyState 
                        icon={<Users className="w-6 h-6" />}
                        title="No users found"
                        description="Try adjusting your filters or search query to find what you're looking for."
                    />
                }
                columns={directoryColumns}
                paginationProps={tableProps.paginationProps}
                enableRowSelection={false}
                enableColumnVisibility={true}
                selectedDataIds={tableProps.selectedDataIds}
                setSelectedDataIds={tableProps.setSelectedDataIds}
                getRowId={getRowId}
                tableHeader={{
                    actionButton: <></>,
                    isSearchable: true,
                    isExportable: false,
                    isFilter: true,
                    enableColumnVisibility: true,
                    search: tableProps.globalSearch,
                    searchQuery: tableProps.setGlobalSearch,
                    filterProps: {
                        title: "Directory",
                        filterData: [
                            {
                                name: "invited",
                                label: "Invitation Status",
                                type: "select",
                                options: [
                                    { label: "Invited", value: "true" },
                                    { label: "Not Invited", value: "false" },
                                ],
                            },
                            {
                                name: "status",
                                label: "App Account Status",
                                type: "select",
                                options: [
                                    { label: "Active Account", value: "Active" },
                                    { label: "Inactive Account", value: "Inactive" },
                                    { label: "Archived", value: "archive" },
                                    { label: "Rejected", value: "rejected" },
                                ],
                            },
                            {
                                name: "employeeStatus",
                                label: "Employee Status",
                                type: "select",
                                options: [
                                    { label: "Active Employee", value: "Active" },
                                    { label: "Inactive Employee", value: "Inactive" },
                                ],
                            },
                            {
                                name: "departmentId",
                                label: "Department",
                                type: "select",
                                options: depts?.data?.data?.map((d) => ({
                                    label: formatDepartmentOptionLabel(d),
                                    value: getDepartmentOptionValue(d),
                                })) || [],
                            }
                        ],
                        onFilter: (filters: Record<string, unknown>) => {
                            tableProps.setFilterBy(toStringFilterRecord(unwrapFilterKeys(filters)));
                            tableProps.setPage(1);
                        },
                    },
                    bulkActions: [],
                }}
            />
        </div>
    );
}
