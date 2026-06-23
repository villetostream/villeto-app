import { useState, useMemo, useCallback, useEffect } from "react";




import { UserPermissionsDialog } from "../UserPermissionDialog";
import { UserProfileModal } from "../modals/UserProfileModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { columns } from "./column";
import { DataTable } from "@/components/datatable";
import { useGetInvitedUsersApi } from "@/queries/users/get-all-users";
import { useUpdateUserApi } from "@/queries/users/update-user";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { AppUser } from "@/queries/departments/get-all-departments";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
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
    const [userToToggle, setUserToToggle] = useState<AppUser | null>(null);

    const usersApi = useGetInvitedUsersApi();
    const updateUser = useUpdateUserApi();
    const depts = useGetAllDepartmentsApi();
    const roles = useGetAllRolesApi();

    const tableprops = useTableData(usersApi?.data?.data ?? []);

    const handleViewProfile = useCallback((userId: string) => {
        setSelectedUser(userId);
        setProfileModalOpen(true);
    }, []);

    const handleToggleStatusClick = useCallback((user: AppUser) => {
        setUserToToggle(user);
    }, []);

    // Memoize the columns array so DataTable doesn't see a new reference
    // on every render — prevents the entire table from re-initialising
    // whenever parent state (search, filters, page) changes.
    const tableColumns = useMemo(
        () => columns(handleViewProfile, handleToggleStatusClick),
        [handleViewProfile, handleToggleStatusClick]
    );

    // Debounce the search string by 200ms so the filteredUsers memo only
    // runs after the user stops typing, not on every keystroke.
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(tableprops.globalSearch ?? ""), 200);
        return () => clearTimeout(id);
    }, [tableprops.globalSearch]);

    const confirmToggleStatus = async () => {
        if (!userToToggle) return;
        const newStatus = (userToToggle.status ?? "").toLowerCase() === "active" ? "inactive" : "active";
        try {
            await updateUser.mutateAsync({ 
                id: userToToggle.userId, 
                status: newStatus 
            } as any);
            toast.success(`User successfully ${newStatus === "active" ? "activated" : "deactivated"}`);
        } catch {
            toast.error("Failed to change user status. Please try again.");
        } finally {
            setUserToToggle(null);
        }
    };

    const users = useMemo(
        () => usersApi?.data?.data ?? [],
        [usersApi.data?.data],
    );

    const filteredUsers = useMemo(() => {
        let result = users;

        // Apply search
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
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
    }, [users, debouncedSearch, tableprops.filterBy]);

    return (
        <div className="space-y-4">
            <DataTable
                data={filteredUsers}
                isLoading={usersApi.isLoading || depts.isLoading || roles.isLoading}
                emptyState={
                    <EmptyState 
                        icon={<Users className="w-6 h-6" />}
                        title="No users found"
                        description="Try adjusting your filters or search query to find what you're looking for."
                    />
                }
                columns={tableColumns}
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

            {userToToggle && (
                <ConfirmDialog 
                    open={!!userToToggle}
                    onOpenChange={(open) => { if (!open) setUserToToggle(null) }}
                    title={(userToToggle.status ?? "").toLowerCase() === "active" ? "Deactivate User?" : "Activate User?"}
                    description={(userToToggle.status ?? "").toLowerCase() === "active" 
                        ? `Are you sure you want to deactivate ${userToToggle.firstName} ${userToToggle.lastName}? They will lose access to Villeto immediately.`
                        : `Are you sure you want to activate ${userToToggle.firstName} ${userToToggle.lastName}? They will regain access to Villeto.`}
                    confirmText={(userToToggle.status ?? "").toLowerCase() === "active" ? "Yes, Deactivate" : "Yes, Activate"}
                    variant={(userToToggle.status ?? "").toLowerCase() === "active" ? "destructive" : "default"}
                    onConfirm={confirmToggleStatus}
                />
            )}
        </div>
    );
}