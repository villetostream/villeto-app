import { useDebouncedValue } from "@/hooks/use-debounced-value";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/datatable";
import { columns } from "./column";
import { useDataTable } from "@/components/datatable/useDataTable";
import {
  GetRolesParams,
  Role,
  useGetAllRolesApi,
} from "@/queries/role/get-all-roles";
import { toStringFilterRecord, unwrapFilterKeys } from "../user-table-utils";

const RoleTable = () => {
  const router = useRouter();
  const tableprops = useTableData();
  const setTotalItems = tableprops.setTotalItems;
  const search = useDebouncedValue(tableprops.globalSearch);
  const depts = useGetAllRolesApi(
    {
      page: tableprops.paginationProps.page,
      limit: tableprops.paginationProps.pageSize,
      view: "summary",
      sortBy: tableprops.sortBy[0]?.id as GetRolesParams["sortBy"],
      sortOrder: tableprops.sortBy[0]?.desc ? "desc" : "asc",
      search: search || undefined,
      status:
        tableprops.filterBy.status === "active"
          ? "Active"
          : tableprops.filterBy.status === "inactive"
            ? "Inactive"
            : undefined,
    },
    { enabled: search === tableprops.globalSearch },
  );
  useEffect(() => {
    setTotalItems(depts.data?.meta.totalCount ?? 0);
  }, [depts.data?.meta.totalCount, setTotalItems]);

  return (
    <DataTable
      data={depts.data?.data ?? []}
      isLoading={depts.isLoading || search !== tableprops.globalSearch}
      manualPagination={true}
      manualFiltering={true}
      manualSorting={true}
      onSortingChange={(sorting) => {
        tableprops.setSortBy(sorting);
        tableprops.setPage(1);
      }}
      columns={columns}
      paginationProps={tableprops.paginationProps}
      enableRowSelection={false}
      enableColumnVisibility={true}
      selectedDataIds={tableprops.selectedDataIds}
      setSelectedDataIds={tableprops.setSelectedDataIds}
      onRowClick={(row) =>
        router.push(`/people/view-role/${(row as Role).roleId}`)
      }
      tableHeader={{
        actionButton: <></>,
        isSearchable: true,
        isExportable: false,
        isFilter: true,
        enableColumnVisibility: true,
        search: tableprops.globalSearch,
        searchQuery: (value) => {
          tableprops.setPage(1);
          tableprops.setGlobalSearch(value);
        },
        filterProps: {
          title: "Filter Roles",
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
          ],
          onFilter: (filters: Record<string, unknown>) => {
            tableprops.setFilterBy(
              toStringFilterRecord(unwrapFilterKeys(filters)),
            );
            tableprops.setPage(1);
          },
        },
        bulkActions: [],
      }}
    />
  );
};

export default RoleTable;

export const useTableData = () => {
  return useDataTable({
    initialPage: 1,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: true,
    manualPagination: true,
  });
};
