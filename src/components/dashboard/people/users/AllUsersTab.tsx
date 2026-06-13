import { useState, useMemo } from "react";




import { UserPermissionsDialog } from "../UserPermissionDialog";
import { UserProfileModal } from "../modals/UserProfileModal";
import { columns } from "./column";
import { DataTable } from "@/components/datatable";
import { useGetInvitedUsersApi } from "@/queries/users/get-all-users";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { useTableData } from "./UserTable";
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

// Mock data
const _mockUsers = [
    {
        id: "01",
        name: "Sarah Chen",
        department: "Marketing",
        cardType: "Virtual",
        role: "Finance Manager",
        location: "New York City",
        manager: "Andy James",
        status: "active",
    },
    // Add more mock data as needed
];

export function AllUsersTab() {
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    const usersApi = useGetInvitedUsersApi();
    const depts = useGetAllDepartmentsApi();
    const roles = useGetAllRolesApi();

    const tableprops = useTableData(usersApi?.data?.data ?? []);

    const handleViewProfile = (userId: string) => {
        setSelectedUser(userId);
        setProfileModalOpen(true);
    };

    const users = useMemo(
        () => usersApi?.data?.data ?? [],
        [usersApi.data?.data],
    );

    const filteredUsers = useMemo(() => {
        let result = users;

        // Apply search
        if (tableprops.globalSearch) {
            const searchLower = tableprops.globalSearch.toLowerCase();
            result = result.filter(u => {
                const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
                const email = (u.email || "").toLowerCase();
                return fullName.includes(searchLower) || email.includes(searchLower);
            });
        }

        // Apply filters
        const filters = tableprops.filterBy || {};
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
    }, [users, tableprops.globalSearch, tableprops.filterBy]);

    return (
        <div className="space-y-4">
            <DataTable
                data={filteredUsers}
                isLoading={usersApi.isLoading || depts.isLoading || roles.isLoading}
                columns={columns(handleViewProfile)}
                paginationProps={{ ...tableprops.paginationProps, total: filteredUsers.length }}
                enableRowSelection={false}
                enableColumnVisibility={true}
                selectedDataIds={tableprops.selectedDataIds}
                setSelectedDataIds={tableprops.setSelectedDataIds}
                tableHeader={{
                    actionButton: <></>,
                    isSearchable: true,
                    isExportable: false,
                    isFilter: true,
                    enableColumnVisibility: true,
                    search: tableprops.globalSearch,
                    searchQuery: tableprops.setGlobalSearch,
                    filterProps: {
                        title: "Filter Users",
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
                            tableprops.setFilterBy(toStringFilterRecord(unwrapFilterKeys(filters)));
                            tableprops.setPage(1); // Reset page on filter
                        },
                    },
                    bulkActions: [],
                }}
            />

            {selectedUser && (
                <>
                    <UserPermissionsDialog
                        open={permissionsDialogOpen}
                        onOpenChange={setPermissionsDialogOpen}
                        userId={selectedUser}
                    />
                    <UserProfileModal 
                        isOpen={profileModalOpen}
                        onClose={() => setProfileModalOpen(false)}
                        userId={selectedUser}
                    />
                </>
            )}
        </div>
    );
}