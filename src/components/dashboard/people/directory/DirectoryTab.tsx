"use client";

import { useMemo, useEffect } from "react";
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
    const usersApi = useGetDirectoryUsersApi();
    const depts = useGetAllDepartmentsApi();
    const roles = useGetAllRolesApi();
    const router = useRouter();

    const users = useMemo(
        () => usersApi?.data?.data ?? [],
        [usersApi.data?.data],
    );
    const isLoading = usersApi.isLoading || depts.isLoading || roles.isLoading;

    const tableProps = useDataTable({
        initialPage: 1,
        initialPageSize: 10,
        totalItems: users.length, 
        manualSorting: false,
        manualFiltering: false,
        manualPagination: false,
    });

    const filteredUsers = useMemo(() => {
        let result = users;

        // Apply search
        if (tableProps.globalSearch) {
            const searchLower = tableProps.globalSearch.toLowerCase();
            result = result.filter(u => {
                const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
                const email = (u.email || "").toLowerCase();
                return fullName.includes(searchLower) || email.includes(searchLower);
            });
        }

        // Apply filters
        const filters = tableProps.filterBy || {};
        if (filters.status && filters.status !== "all") {
            const filterStat = filters.status.toLowerCase();
            result = result.filter(u => {
                const statusStr = (u.status || "").toLowerCase();
                const isActiveStr = u.isActive ? "active" : "inactive";
                return statusStr === filterStat || isActiveStr === filterStat;
            });
        }
        if (filters.roleId && filters.roleId !== "all") {
            result = result.filter(u => getUserRoleId(u) === filters.roleId);
        }
        if (filters.departmentId && filters.departmentId !== "all") {
            result = result.filter(u => getUserDepartmentId(u) === filters.departmentId);
        }
        if (filters.manager && filters.manager !== "all") {
            result = result.filter(u =>
                getUserManagerName(u).includes(filters.manager.toLowerCase())
            );
        }

        return result;
    }, [users, tableProps.globalSearch, tableProps.filterBy]);

    useEffect(() => {
        tableProps.setTotalItems(filteredUsers.length);
    }, [filteredUsers.length, tableProps.setTotalItems]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
            </div>
        );
    }

    // Empty state
    if (users.length === 0) {
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
        <div className="space-y-4">
            <DataTable
                data={filteredUsers}
                isLoading={isLoading}
                emptyState={
                    <EmptyState 
                        icon={<Users className="w-6 h-6" />}
                        title="No directory members found"
                        description="Try adjusting your filters or search query to find what you're looking for."
                    />
                }
                columns={directoryColumns}
                paginationProps={{ ...tableProps.paginationProps, total: filteredUsers.length }}
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
                        title: "Filter Directory",
                        filterData: [
                            {
                                name: "status",
                                label: "Status",
                                type: "select",
                                options: [
                                    { label: "Active", value: "active" },
                                    { label: "Inactive", value: "inactive" },
                                ],
                            },
                            {
                                name: "roleId",
                                label: "Role",
                                type: "select",
                                options: roles?.data?.data?.map((r) => ({
                                    label: formatRoleOptionLabel(r),
                                    value: r.roleId,
                                })) || [],
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
