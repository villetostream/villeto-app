"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useGetUninvitedUsersApi } from "@/queries/users/get-all-users";
import { Skeleton } from "@/components/ui/skeleton";
import { useAxios } from "@/hooks/useAxios";
import { useAuthStore } from "@/stores/auth-stores";
import { useDataTable } from "@/components/datatable/useDataTable";
import { API_KEYS } from "@/lib/constants/apis";
import { toast } from "sonner";
import { getApiErrorMessage, isRecord } from "@/lib/types/api-error";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DirectoryUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string | null;
  position?: string | null;
  status?: string | null;
  manager?: { firstName?: string; lastName?: string } | string | null;
  department?: { name?: string; departmentName?: string; departmentId?: string } | string | null;
  corporateCard?: boolean;
}

function getDepartmentName(dept: DirectoryUser["department"]): string {
  if (!dept) return "—";
  if (typeof dept === "string") return dept || "—";
  if (isRecord(dept)) {
    const name = dept.departmentName ?? dept.name;
    if (typeof name === "string" && name) return name;
  }
  return "—";
}

function formatName(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface OrganizationDirectoryPageProps {
  onBack?: () => void;
}

const PAGE_SIZE_OPTIONS = [
  { label: "5", value: "5" },
  { label: "10", value: "10" },
  { label: "20", value: "20" },
  { label: "50", value: "50" },
  { label: "100", value: "100" },
];

export function OrganizationDirectoryPage({ onBack }: OrganizationDirectoryPageProps) {
  const usersApi = useGetUninvitedUsersApi();
  const router = useRouter();
  const axios = useAxios();
  const user = useAuthStore((state) => state.user);
  const [businessName, setBusinessName] = useState<string>("your company");
  const [isInviting, setIsInviting] = useState(false);

  const users = useMemo(
    () => (usersApi?.data?.data ?? []) as DirectoryUser[],
    [usersApi.data?.data],
  );
  const isLoading = usersApi.isLoading;

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Corporate card toggle state (keyed by userId)
  const [corporateCardState, setCorporateCardState] = useState<Record<string, boolean>>({});

  const usersKey = users.map((u) => u.userId).join(",");
  const [syncedUsersKey, setSyncedUsersKey] = useState("");
  if (users.length > 0 && usersKey !== syncedUsersKey) {
    setSyncedUsersKey(usersKey);
    const cardState: Record<string, boolean> = {};
    users.forEach((u) => {
      cardState[u.userId] = u.corporateCard ?? false;
    });
    setCorporateCardState(cardState);
  }

  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    users.forEach((u) => {
      const dept = getDepartmentName(u.department);
      if (dept !== "—") depts.add(dept);
    });
    return Array.from(depts).sort();
  }, [users]);

  useEffect(() => {
    const fetchBusinessName = async () => {
      try {
        if (user?.companyId) {
          const response = await axios.get(`/companies/${user.companyId}`);
          const companyData = response?.data?.data || response?.data;
          if (companyData) {
            setBusinessName(companyData.companyName || companyData.businessName || "your company");
          }
        }
      } catch {
        // fallback silently
      }
    };
    fetchBusinessName();
  }, [user?.companyId, axios]);

  const filteredUsers = useMemo(() => {
    const searchLower = search.toLowerCase();
    return users.filter((u) => {
      if (departmentFilter && departmentFilter !== "all" && getDepartmentName(u.department).toLowerCase() !== departmentFilter.toLowerCase()) return false;
      if (!search) return true;
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const email = u.email.toLowerCase();
      const dept = getDepartmentName(u.department).toLowerCase();
      const job = (u.position || u.jobTitle || "").toLowerCase();
      const managerName = u.manager
        ? typeof u.manager === "object"
          ? `${u.manager.firstName || ""} ${u.manager.lastName || ""}`.trim().toLowerCase()
          : u.manager.toLowerCase()
        : "";
      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        dept.includes(searchLower) ||
        job.includes(searchLower) ||
        managerName.includes(searchLower)
      );
    });
  }, [users, search, departmentFilter]);

  const totalItems = filteredUsers.length;

  // useDataTable for pagination state (same as AllUsersTab pattern)
  const tableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 10,
    totalItems,
    manualPagination: false,
  });

  const { paginationProps } = tableProps;

  // When filters change, reset to page 1
  useEffect(() => {
    paginationProps.setPage(1);
  }, [search, departmentFilter, paginationProps]);

  const pageSize = paginationProps.pageSize;
  const currentPage = paginationProps.page;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredUsers.slice(startIndex, startIndex + pageSize);
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Pagination page number helper (same logic as DataTable)
  const getPageNumbers = (current: number, total: number) => {
    const delta = 2;
    const pages: number[] = [];
    for (
      let i = Math.max(1, current - delta);
      i <= Math.min(total, current + delta);
      i++
    ) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  // Select / deselect ALL filtered users (across all pages)
  const handleSelectAllChange = (checked: boolean | "indeterminate") => {
    if (checked === "indeterminate") {
      // indeterminate click → select all filtered users
      setSelected(new Set(filteredUsers.map((u) => u.userId)));
      return;
    }
    if (checked) {
      setSelected(new Set(filteredUsers.map((u) => u.userId)));
    } else {
      setSelected(new Set());
    }
  };

  const handleSelectChange = (id: string, checked: boolean) => {
    const newSelected = new Set(selected);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelected(newSelected);
  };

  // Header checkbox reflects state for ALL filtered users (not just current page)
  const isAllSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selected.has(u.userId));
  const isSomeSelected = filteredUsers.some((u) => selected.has(u.userId)) && !isAllSelected;

  const handleCorporateCardToggle = (userId: string) => {
    setCorporateCardState((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
    // TODO: call API endpoint when it becomes available
  };

  const handleInvite = async () => {
    if (selected.size === 0) return;
    setIsInviting(true);
    try {
      await axios.post(API_KEYS.COMPANY.EMPLOYEE_INVITES, {
        employeeIds: Array.from(selected),
      });
      toast.success("Invitations sent successfully!");
      // Notify setup guide — ticks "invitations" step
      window.dispatchEvent(new CustomEvent("villeto:invitation-sent"));
      router.push("/people?tab=directory");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to send invitations. Please try again."));
    } finally {
      setIsInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-60" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  const selectedCount = selected.size;

  return (
    <div className="flex flex-col h-full space-y-4 overflow-y-n">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Invite Employees from Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Select people to invite to {businessName} as users.{" "}
            {users.length > 0 && (
              <span className="text-[#00BFA5] font-medium">
                Use the checkbox in the table header to select or deselect all.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Setup guide inline tip — non-blocking, shown only when users exist */}
      {users.length > 0 && (
        <div className="flex items-start gap-3 bg-[#f0fdf9] border border-[#a7f3d0] rounded-xl px-4 py-3 flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-[#0d9488] flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5L8.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#065f46]">Select employees to invite</p>
            <p className="text-xs text-[#047857] mt-0.5">
              Tick the <strong>checkbox in the header</strong> to select all, or check employees one by one.
              Then click <strong>Invite Users</strong> (bottom right) to send invitations.
            </p>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white rounded-lg border mt-4 flex flex-col items-center justify-center py-24 px-6">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No uninvited employees</h3>
          <p className="text-gray-500 text-sm mb-6 text-center max-w-md">
            It looks like everyone in your directory has already been invited or your directory is empty. To invite more employees, please update your directory.
          </p>
          <Button
            onClick={() => {
              if (onBack) onBack();
              else router.push("/people?tab=directory");
            }}
            className="bg-[#00BFA5] hover:bg-[#00BFA5]/90 text-white px-6 py-2.5 rounded-lg"
          >
            Go to Directory Tab
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 flex-shrink-0">
            <Input
              placeholder="Search directory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {uniqueDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-md border bg-white">
            <Table className="min-w-full divide-y divide-gray-200">
              <TableHeader className="bg-gray-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[40px] text-center px-4 py-3">
                    <Checkbox
                      data-tour="select-all-checkbox"
                      checked={isSomeSelected ? "indeterminate" : isAllSelected}
                      onCheckedChange={handleSelectAllChange}
                    />
                  </TableHead>
                  <TableHead className="w-[50px] font-semibold px-4 py-3 text-xs text-gray-700 tracking-wider">S/N</TableHead>
                  <TableHead className="w-[250px] font-semibold px-4 py-3 text-xs text-gray-700 tracking-wider">DETAILS</TableHead>
                  <TableHead className="w-[150px] font-semibold px-4 py-3 text-xs text-gray-700 tracking-wider">DEPARTMENT</TableHead>
                  <TableHead className="w-[150px] font-semibold px-4 py-3 text-xs text-gray-700 tracking-wider">JOB TITLE</TableHead>
                  <TableHead className="w-[150px] font-semibold px-4 py-3 text-xs text-gray-700 tracking-wider">REPORTS TO</TableHead>
                  <TableHead className="w-[150px] font-semibold px-4 py-3 text-xs text-gray-700 tracking-wider text-center">CORPORATE CARD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((employee, index) => {
                  const firstName = employee.firstName || "";
                  const lastName = employee.lastName || "";
                  const fullName = `${firstName} ${lastName}`.trim() || "-";
                  const dept = getDepartmentName(employee.department);
                  const position = employee.position;
                  const jobTitle = employee.jobTitle;
                  const value = jobTitle || position;
                  let managerName = "—";
                  if (employee.manager && typeof employee.manager === "object") {
                    const first = formatName(employee.manager.firstName);
                    const last = formatName(employee.manager.lastName);
                    managerName = `${first} ${last}`.trim() || "—";
                  } else if (typeof employee.manager === "string" && employee.manager) {
                    managerName = formatName(employee.manager);
                  }
                  const rowNum = String(startIndex + index + 1).padStart(2, "0");

                  return (
                    <TableRow key={employee.userId}>
                      <TableCell className="text-center px-4 py-2.5">
                        <Checkbox
                          checked={selected.has(employee.userId)}
                          onCheckedChange={(checked) => handleSelectChange(employee.userId, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="text-sm px-4 py-2.5 text-[#181D27]">{rowNum}</TableCell>
                      <TableCell className="px-4 py-2.5 text-[#181D27]">
                        <div className="flex flex-col">
                          <p className="capitalize font-medium">{fullName}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize px-4 py-2.5 text-[#181D27]">{dept}</TableCell>
                      <TableCell className="text-sm px-4 py-2.5 text-[#181D27]">{formatName(value)}</TableCell>
                      <TableCell className="font-medium px-4 py-2.5 text-[#181D27]">{managerName}</TableCell>
                      <TableCell className="px-4 py-2.5">
                        <div className="flex justify-center">
                          <Switch
                            checked={corporateCardState[employee.userId] ?? false}
                            onCheckedChange={() => handleCorporateCardToggle(employee.userId)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedData.length === 0 && users.length > 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="text-center py-20 text-md text-gray-500 hover:bg-transparent">
                      No users match your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination — same style as DataTable */}
          {totalItems > 0 && (
            <div className="flex md:flex-row items-center justify-between bg-gray-50 py-2 px-4 rounded-b-md w-full">
              <div className="flex items-center gap-2 w-full sm:w-auto mb-2 md:mb-0">
                <span className="text-sm text-gray-700 whitespace-nowrap">
                  {totalItems > 0 ? (
                    <>
                      Showing {startIndex + 1}-{endIndex} of {totalItems} entries
                    </>
                  ) : (
                    <>Showing 0 of 0 entries</>
                  )}
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    paginationProps.setPageSize(Number(value));
                    paginationProps.setPage(1);
                  }}
                >
                  <SelectTrigger className="w-fit min-w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex w-full md:w-auto justify-end gap-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => {
                          e.preventDefault();
                          paginationProps.setPage(Math.max(1, currentPage - 1));
                        }}
                        href="#"
                        isDisabled={currentPage === 1}
                        isActive={currentPage > 1}
                        size={"sm"}
                      />
                    </PaginationItem>

                    {/* First page + Ellipsis */}
                    {pageNumbers[0] > 1 && (
                      <>
                        <PaginationItem>
                          <PaginationLink
                            onClick={(e) => {
                              e.preventDefault();
                              paginationProps.setPage(1);
                            }}
                            href="#"
                            isActive={1 === currentPage}
                            size={"sm"}
                          >
                            1
                          </PaginationLink>
                        </PaginationItem>
                        {pageNumbers[0] > 2 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                      </>
                    )}

                    <div className="hidden md:flex">
                      {pageNumbers.map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            className={`${currentPage !== page ? "text-muted-foreground" : ""}`}
                            onClick={(e) => {
                              e.preventDefault();
                              paginationProps.setPage(page);
                            }}
                            href="#"
                            isActive={page === currentPage}
                            size={"sm"}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      {/* Ellipsis + Last page */}
                      {pageNumbers[pageNumbers.length - 1] < totalPages && (
                        <>
                          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              size="sm"
                              isActive={totalPages === currentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                paginationProps.setPage(totalPages);
                              }}
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        </>
                      )}
                    </div>

                    <div className="md:hidden block">
                      <PaginationItem>
                        <PaginationLink isActive size="sm" href={""}>
                          {currentPage}
                        </PaginationLink>
                      </PaginationItem>
                    </div>

                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => {
                          e.preventDefault();
                          paginationProps.setPage(currentPage + 1);
                        }}
                        href="#"
                        size={"sm"}
                        isActive={currentPage < totalPages}
                        isDisabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 flex-shrink-0">
            <Button data-tour="send-invitations-button" onClick={handleInvite} className="bg-[#00BFA5] hover:bg-[#00BFA5]/90 min-w-[180px]" disabled={selectedCount === 0 || isInviting}>
              {isInviting ? "Sending invites..." : `Invite ${selectedCount} User${selectedCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};