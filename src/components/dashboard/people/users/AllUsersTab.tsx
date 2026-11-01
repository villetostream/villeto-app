import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useState, useMemo, useCallback, useEffect } from "react";
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
import { useAuthStore } from "@/stores/auth-stores";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import {
    formatDepartmentOptionLabel,
    formatRoleOptionLabel,
    getDepartmentOptionValue,
    toStringFilterRecord,
    unwrapFilterKeys,
} from "../user-table-utils";

export function AllUsersTab() {
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [userToToggle, setUserToToggle] = useState<AppUser | null>(null);

    const updateUser = useUpdateUserApi();
    const resendInvitation = useResendInvitationApi();
    const [filtersOpened, setFiltersOpened] = useState(false);
    const depts = useGetAllDepartmentsApi({ enabled: filtersOpened });
    const roles = useGetAllRolesApi(undefined, { enabled: filtersOpened });

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

    const currentUser = useAuthStore((s) => s.user);

    // Memoize the columns array so DataTable doesn't see a new reference
    // on every render — prevents the entire table from re-initialising
    // whenever parent state (search, filters, page) changes.
    const tableColumns = useMemo(
        () => columns(handleViewProfile, handleToggleStatusClick, handleResendInvitation, currentUser),
        [handleViewProfile, handleToggleStatusClick, handleResendInvitation, currentUser]
    );

    const tableprops = useDataTable({
        initialPage: 1,
        initialPageSize: 20,
        totalItems: 0,
        manualSorting: true,
        manualFiltering: true,
        manualPagination: true,
    });

    const page = tableprops.page;
    const limit = tableprops.pageSize;
    const debouncedSearch = useDebouncedValue(tableprops.globalSearch, 300);
    const searchReady = debouncedSearch === tableprops.globalSearch;
    const sort = tableprops.sortBy[0];

    const filters = tableprops.filterBy || {};
    const status = filters.status ? (filters.status as string) : "all";
    const employeeStatus = filters.employeeStatus && filters.employeeStatus !== "all" ? (filters.employeeStatus as string) : undefined;
    const roleId = filters.roleId && filters.roleId !== "all" ? (filters.roleId as string) : undefined;
    const departmentId = filters.departmentId && filters.departmentId !== "all" ? (filters.departmentId as string) : undefined;

    const usersApi = useGetInvitedUsersApi({
        enabled: searchReady,
        params: {
            view: "summary",
            search: debouncedSearch.trim() || undefined,
            departmentId,
            sortBy: (sort?.id === "position" ? "roleName" : sort?.id),
            sortOrder: sort ? (sort.desc ? "DESC" : "ASC") : undefined,
            page,
            limit,
            status,
            employeeStatus,
            roleId,
        }
    });

    const confirmToggleStatus = async () => {
        if (!userToToggle) return;
        const newStatus = (userToToggle.status ?? "").toLowerCase() === "active" ? "inactive" : "active";
        try {
            await updateUser.mutateAsync({ 
                id: userToToggle.userId, 
                status: newStatus 
            });
            toast.success(`User successfully ${newStatus === "active" ? "activated" : "deactivated"}`);
        } catch {
            toast.error("Failed to change user status. Please try again.");
        } finally {
            setUserToToggle(null);
        }
    };

    const users = usersApi.data?.data ?? [];

    const { setTotalItems } = tableprops;
    useEffect(() => {
        setTotalItems(usersApi.data?.meta?.totalCount ?? 0);
    }, [usersApi.data?.meta?.totalCount, setTotalItems]);

    return (
        <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <DataTable
                data={users}
                isLoading={usersApi.isLoading || !searchReady}
                manualPagination={true}
                manualSorting={true}
                onSortingChange={(sorting) => {
                    tableprops.setSortBy(sorting);
                    tableprops.setPage(1);
                }}
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
                onRowClick={(row: AppUser) => handleViewProfile(row.userId)}
                tableHeader={{
                    actionButton: <></>,
                    isSearchable: true,
                    isExportable: false,
                    isFilter: true,
                    enableColumnVisibility: true,
                    search: tableprops.globalSearch,
                    searchQuery: (value) => {
                        tableprops.setGlobalSearch(value);
                        tableprops.setPage(1);
                    },
                    filterProps: {
                        onOpen: () => setFiltersOpened(true),
                        isLoading: depts.isLoading || roles.isLoading,
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
