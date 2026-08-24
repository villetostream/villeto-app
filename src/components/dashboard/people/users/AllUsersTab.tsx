import { useState, useMemo, useCallback, useEffect } from "react";




import { UserPermissionsDialog } from "../UserPermissionDialog";
import { UserProfileModal } from "../modals/UserProfileModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { columns } from "./column";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { useGetInvitedUsersApi } from "@/queries/users/get-all-users";
import { useUpdateUserApi } from "@/queries/users/update-user";
import { useResendInvitationApi } from "@/queries/users/resend-invitation";
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

    const updateUser = useUpdateUserApi();
    const resendInvitation = useResendInvitationApi();
    const depts = useGetAllDepartmentsApi();
    const roles = useGetAllRolesApi();

    const handleViewProfile = useCallback((userId: string) => {
        setSelectedUser(userId);
        setProfileModalOpen(true);
    }, []);

    const handleToggleStatusClick = useCallback((user: AppUser) => {
        setUserToToggle(user);
    }, []);

    const handleResendInvitation = useCallback(async (user: AppUser) => {
        try {
            await resendInvitation.mutateAsync({ email: user.email });
            toast.success("Invitation sent successfully!");
        } catch {
            toast.error("Failed to resend invitation. Please try again.");
        }
    }, [resendInvitation]);

    // Memoize the columns array so DataTable doesn't see a new reference
    // on every render — prevents the entire table from re-initialising
    // whenever parent state (search, filters, page) changes.
    const tableColumns = useMemo(
        () => columns(handleViewProfile, handleToggleStatusClick, handleResendInvitation),
        [handleViewProfile, handleToggleStatusClick, handleResendInvitation]
    );

    const tableprops = useDataTable({
        initialPage: 1,
        totalItems: 0,
        manualSorting: false,
        manualFiltering: true,
        manualPagination: false,
    });

    const page = 1;
    const limit = 1000;

    const filters = tableprops.filterBy || {};
    const status = filters.status ? (filters.status as string) : "all";
    const employeeStatus = filters.employeeStatus && filters.employeeStatus !== "all" ? (filters.employeeStatus as string) : undefined;
    const roleId = filters.roleId && filters.roleId !== "all" ? (filters.roleId as string) : undefined;
    const departmentId = filters.departmentId && filters.departmentId !== "all" ? (filters.departmentId as string) : undefined;

    const usersApi = useGetInvitedUsersApi({
        params: {
            page,
            limit,
            status,
            employeeStatus,
            roleId,
        }
    });

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

    useEffect(() => {
        tableprops.setTotalItems(users.length);
    }, [users.length, tableprops.setTotalItems]);

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
                columns={tableColumns}
                paginationProps={tableprops.paginationProps}
                enableRowSelection={false}
                enableColumnVisibility={true}
                selectedDataIds={tableprops.selectedDataIds}
                setSelectedDataIds={tableprops.setSelectedDataIds}
                onRowClick={(row: any) => handleViewProfile(row.userId)}
                tableHeader={{
                    actionButton: <></>,
                    isSearchable: true,
                    isExportable: false,
                    isFilter: true,
                    enableColumnVisibility: true,
                    search: tableprops.globalSearch,
                    searchQuery: tableprops.setGlobalSearch,
                    filterProps: {
                        title: "Invited Users",
                        filterData: [
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
                    title="Deactivate User?"
                    description={`Are you sure you want to deactivate ${userToToggle.firstName} ${userToToggle.lastName}? They will lose access to Villeto immediately.`}
                    confirmText="Yes, Deactivate"
                    variant="destructive"
                    onConfirm={confirmToggleStatus}
                />
            )}
        </div>
    );
}