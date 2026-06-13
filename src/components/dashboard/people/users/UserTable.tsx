import React from 'react'
import { DataTable } from '@/components/datatable';
import { columns } from './column';
import { useDataTable } from '@/components/datatable/useDataTable';
import { useGetAllRolesApi } from '@/queries/role/get-all-roles';
import { useGetAllUsersApi } from '@/queries/users/get-all-users';
import { useGetAllDepartmentsApi, AppUser } from '@/queries/departments/get-all-departments';
import { logger } from '@/lib/logger';
import {
    formatDepartmentOptionLabel,
    formatRoleOptionLabel,
    getDepartmentOptionValue,
} from '../user-table-utils';

const UsersTable = () => {
    const usersApi = useGetAllUsersApi();
    const depts = useGetAllDepartmentsApi();
    const roles = useGetAllRolesApi();

    const tableprops = useTableData(usersApi?.data?.data ?? []);

    return (
        <DataTable
            data={usersApi?.data?.data ?? []}
            isLoading={usersApi.isLoading || depts.isLoading || roles.isLoading}
            columns={columns(() => {})}
            paginationProps={{ ...tableprops.paginationProps, total: usersApi?.data?.meta.totalCount ?? 0 }}
            enableRowSelection={true}
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
                            name: "departmentId",
                            label: "Department",
                            type: "select",
                            options: depts?.data?.data?.map((d) => ({
                                label: formatDepartmentOptionLabel(d),
                                value: getDepartmentOptionValue(d),
                            })) || [],
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
                    ],
                    onFilter: (filters) => {
                        logger.log("Filters:", filters);
                    },
                },
                bulkActions: [],
            }}
        />
    )
}

export default UsersTable

export const useTableData = (data: AppUser[]) => {
    return useDataTable({
        initialPage: 1,
        initialPageSize: 10,
        totalItems: data.length,
        manualSorting: false,
        manualFiltering: false,
        manualPagination: false,
    });
}