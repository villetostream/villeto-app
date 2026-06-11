"use client";

import { useMemo, useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NewExpenseHeaderAction from "@/components/expenses/NewExpenseHeaderAction";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import ExpenseTable from "@/components/expenses/table/ExpenseTable";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import {
  personalExpenseColumns,
  type PersonalExpenseRow,
} from "@/components/expenses/table/personalColumns";
import { useSearchParams, useRouter } from "next/navigation";
import ExpenseEmptyState from "@/components/expenses/EmptyState";
import { usePersonalExpenses, useCompanyExpenses, CompanyExpenseReport } from "@/lib/react-query/expenses";
import { PersonalExpensesSkeleton } from "@/components/expenses/PersonalExpensesSkeleton";
import { getCompanyColumns } from "@/components/expenses/table/companyColumns";
import { useAuthStore } from "@/stores/auth-stores";

const statusMap: Record<string, string | null> = {
  all: null,
  draft: "draft",
  submitted: "pending",
  approved: "approved",
  rejected: "declined",
  pending: "pending",
  paid: "paid",
};

export default function Reimbursements() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const can = useAuthStore((state) => state.can);
  const authReady = useAuthStore((state) => !state.isLoading);

  // Scope derivation
  const hasTeamScope    = can('expense.report', 'read_department');
  const hasCompanyScope = can('expense.report', 'read_company');
  const canViewCompanyExpenses = hasTeamScope || hasCompanyScope;

  // Build outer tabs based on permissions
  const outerTabs = [
    ...(hasCompanyScope ? [{ key: "company-expenses", label: "Company Expenses" }] : []),
    ...(hasTeamScope    ? [{ key: "team-expenses",    label: "Team Expenses"    }] : []),
    { key: "personal-expenses", label: "My Expenses" },
  ];

  const defaultOuterTab = outerTabs[0].key;

  const initialOuterTab =
    searchParams.get("tab") && outerTabs.some(t => t.key === searchParams.get("tab"))
      ? searchParams.get("tab")!
      : defaultOuterTab;
  const [outerTab, setOuterTab] = useState(initialOuterTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && outerTabs.some(t => t.key === tabFromUrl)) {
      setOuterTab(tabFromUrl);
    }
  }, [searchParams]);

  // Read initial page from URL for personal expenses (so back from edit/view/delete restores page)
  const pageParam = searchParams.get("page");
  const initialPage =
    pageParam && /^\d+$/.test(pageParam)
      ? Math.max(1, parseInt(pageParam, 10))
      : 1;

  // Update URL when tab changes (but not on initial mount to avoid conflicts)
  const handleTabChange = (value: string) => {
    setOuterTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    if (value === "personal-expenses" && page > 1) {
      params.set("page", String(page));
    } else if (value !== "personal-expenses") {
      params.delete("page");
    }
    router.replace(`/expenses?${params.toString()}`, { scroll: false });
  };

  const [activeTab, setActiveTab] = useState("all");
  
  // Company Expenses State
  const [companyExpenses, setCompanyExpenses] = useState<CompanyExpenseReport[]>([]);
  const [filteredCompanyExpenses, setFilteredCompanyExpenses] = useState<CompanyExpenseReport[]>([]);

  const [personalExpenses, setPersonalExpenses] = useState<
    PersonalExpenseRow[]
  >([]);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(100);

  // Persist current tab and page so back from edit/view/delete can restore
  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("expensesReturnTab", outerTab);
    sessionStorage.setItem("expensesReturnPage", String(page));
  }, [outerTab, page]);

  // Sync page with URL when searchParams.page changes (e.g. user navigated back with ?page=2)
  useEffect(() => {
    const p = searchParams.get("page");
    if (p && /^\d+$/.test(p)) {
      const num = parseInt(p, 10);
      if (num >= 1 && num !== page) setPage(num);
    }
  }, [searchParams]);

  // Fetch personal expenses using React Query
  const { data: personalExpensesData, isLoading: isLoadingPersonalExpenses } =
    usePersonalExpenses(page, limit);

  // Fetch company-scope expenses (company tab)
  const { data: companyExpensesData, isLoading: isLoadingCompanyExpenses } =
    useCompanyExpenses(page, limit, "company", undefined, undefined, hasCompanyScope);

  // Fetch team-scope expenses (team tab)
  const { data: teamExpensesData, isLoading: isLoadingTeamExpenses } =
    useCompanyExpenses(page, limit, "team", undefined, undefined, hasTeamScope);

  const isLoadingCompany = isLoadingCompanyExpenses && hasCompanyScope;
  const isLoadingTeam    = isLoadingTeamExpenses    && hasTeamScope;

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Transform personal expenses
  useEffect(() => {
    if (personalExpensesData?.reports) {
      const getMostRecentDate = (report: any): number => {
        const createdAt = new Date(report.createdAt).getTime();
        const updatedAt = new Date(report.updatedAt).getTime();
        return Math.max(createdAt, updatedAt);
      };

      const sortedReports = [...personalExpensesData.reports].sort((a, b) => {
        return getMostRecentDate(b) - getMostRecentDate(a);
      });

      const transformedExpenses: PersonalExpenseRow[] = sortedReports.map(
        (report) => ({
          date: formatDate(report.createdAt),
          reportName: report.reportTitle,
          category:
            report.costCenter && report.costCenter.trim()
              ? report.costCenter
              : "Uncategorized",
          amount: report.totalAmount,
          status: report.status,
          reportId: report.reportId,
        }),
      );
      setPersonalExpenses(transformedExpenses);
    }
  }, [personalExpensesData]);

  useEffect(() => {
    if (companyExpensesData?.reports) {
      const getMostRecentDate = (report: CompanyExpenseReport): number => {
        const createdAt = new Date(report.createdAt).getTime();
        const updatedAt = new Date(report.updatedAt).getTime();
        return Math.max(createdAt, updatedAt);
      };
      const sortedReports = [...companyExpensesData.reports].sort((a, b) =>
        getMostRecentDate(b) - getMostRecentDate(a),
      );
      setCompanyExpenses(sortedReports);
      setFilteredCompanyExpenses(sortedReports);
    }
  }, [companyExpensesData]);

  const [teamExpenses, setTeamExpenses]             = useState<CompanyExpenseReport[]>([]);
  const [filteredTeamExpenses, setFilteredTeamExpenses] = useState<CompanyExpenseReport[]>([]);

  useEffect(() => {
    if (teamExpensesData?.reports) {
      const sorted = [...teamExpensesData.reports].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setTeamExpenses(sorted);
      setFilteredTeamExpenses(sorted);
    }
  }, [teamExpensesData]);

  const calculateStats = (data: CompanyExpenseReport[]) => {
    const totalExpenses = data.length;
    const pendingApprovals = data.filter(
      (item) => item.status === "pending",
    ).length;
    const approvedExpenses = data.filter(
      (item) => item.status === "approved" || item.status === "paid",
    ).length;
    const paidExpenses = data.filter((item) => item.status === "paid").length;

    return {
      totalExpenses,
      pendingApprovals,
      approvedExpenses,
      paidExpenses,
    };
  };

  const stats = calculateStats(filteredCompanyExpenses as any);

  const handleFilteredCompanyDataChange = (filteredData: any) => {
    setFilteredCompanyExpenses(filteredData);
  };

  const personalStats = useMemo(() => {
    const counts = {
      draft: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
    };

    for (const e of personalExpenses ?? []) {
      const status = e?.status;
      if (status === "draft") counts.draft += 1;
      if (status === "approved") counts.approved += 1;
      if (status === "paid") counts.paid += 1;
      if (status === "declined") counts.rejected += 1;
    }

    return counts;
  }, [personalExpenses]);

  // Reusable helpers
  const expenseStatusTabs = [
    { key: "all",      filter: null as string | null },
    { key: "draft",    filter: "draft" },
    { key: "pending",  filter: "pending" },
    { key: "approved", filter: "approved" },
    { key: "rejected", filter: "declined" },
    { key: "paid",     filter: "paid" },
  ];

  const renderCompanyExpenseTab = ({
    data,
    isLoading,
    isLoadingExpenses,
    onFilterChange,
    scope,
  }: {
    data: CompanyExpenseReport[];
    isLoading: boolean;
    isLoadingExpenses: boolean;
    onFilterChange: (d: any) => void;
    scope: "team" | "company";
  }) => {
    const localStats = calculateStats(data as any);
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
          <StatsCard isLoading={isLoadingExpenses} title="Total Expenses" value={localStats.totalExpenses.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#384A57] rounded-full"><img src="/images/svgs/draft.svg" alt="draft icon" /></div>}
            subtitle={<span className="text-xs leading-[125%]">All expenses submitted</span>} />
          <StatsCard isLoading={isLoadingExpenses} title="Pending Approvals" value={localStats.pendingApprovals.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#F45B69] rounded-full text-white"><img src="/images/receipt-pending.png" alt="pending icon" /></div>}
            subtitle={<span className="text-xs leading-[125%]">Awaiting review.</span>} />
          <StatsCard isLoading={isLoadingExpenses} title="Approved Expenses" value={localStats.approvedExpenses.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#5A67D8] rounded-full"><img src="/images/svgs/submitted.svg" alt="submitted icon" /></div>}
            subtitle={<span className="text-xs leading-[125%]">Ready for payment</span>} />
          <StatsCard isLoading={isLoadingExpenses} title="Paid" value={localStats.paidExpenses.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#38B2AC] rounded-full text-white"><img src="/images/svgs/money.svg" alt="money icon" /></div>}
            subtitle={<span className="text-xs leading-[125%]">Completed transactions</span>} />
        </div>
        {!authReady || isLoading ? (
          <PersonalExpensesSkeleton showStats={false} />
        ) : data.length === 0 ? (
          <ExpenseEmptyState title="No expense has been added" subtitle="" showButton={false} />
        ) : (
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
              </TabsList>
              <div id="tab-actions" className="flex items-center gap-2" />
            </div>
            {expenseStatusTabs.map(t => (
              <TabsContent key={t.key} value={t.key}>
                <ExpenseTable
                  actionButton={<></>}
                  statusFilter={t.filter}
                  data={data as any}
                  columnsOverride={getCompanyColumns(scope) as any}
                  onFilteredDataChange={onFilterChange}
                  scope={scope}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    );
  };

  const renderPersonalExpenseTab = () => (
    <PermissionGuard requiredPermissions={[]}>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
          <StatsCard isLoading={isLoadingPersonalExpenses} title="Draft" value={personalStats.draft.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#384A57] rounded-full"><img src="/images/svgs/draft.svg" alt="draft icon" /></div>}
            subtitle={<span className="text-xs leading-[125%]">Manage your saved items</span>} />
          <StatsCard isLoading={isLoadingPersonalExpenses} title="Approved" value={personalStats.approved.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#418341] rounded-full text-white"><img src="/images/svgs/check.svg" alt="check icon" /></div>}
            subtitle={<span className="text-xs leading-[125%]">View all items reviewed.</span>} />
          <StatsCard isLoading={isLoadingPersonalExpenses} title="Rejected" value={personalStats.rejected.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#F45B69] rounded-full text-white"><img src="/images/receipt-pending.png" alt="pending icon" /></div>}
            subtitle={<span className="text-xs leading-[125%]">View all items Rejected.</span>} />
          <StatsCard isLoading={isLoadingPersonalExpenses} title="Paid" value={personalStats.paid.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#38B2AC] rounded-full text-white"><img src="/images/svgs/money.svg" alt="money icon" /></div>}
            subtitle={<span className="text-xs leading-[125%]">Access completed payments.</span>} />
        </div>
        {!authReady || isLoadingPersonalExpenses ? (
          <PersonalExpensesSkeleton showStats={false} />
        ) : personalExpenses.length === 0 ? (
          <ExpenseEmptyState />
        ) : (
          <Tabs defaultValue="all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
              </TabsList>
              <div id="tab-actions" className="flex items-center gap-2" />
            </div>
            {expenseStatusTabs.map(t => (
              <TabsContent key={t.key} value={t.key}>
                <ExpenseTable statusFilter={t.filter} data={personalExpenses as any} columnsOverride={personalExpenseColumns as any} page={page} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </PermissionGuard>
  );

  return (
    <div style={{ maxHeight: "100%" }}>
      {outerTabs.length === 1 ? (
        // Personal-only view
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <h2 className="text-xl font-semibold text-gray-900">My Expenses</h2>
            <NewExpenseHeaderAction />
          </div>
          {renderPersonalExpenseTab()}
        </div>
      ) : (
        <Tabs value={outerTab} onValueChange={handleTabChange}>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <TabsList>
              {outerTabs.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="cursor-pointer">{t.label}</TabsTrigger>
              ))}
            </TabsList>
            {outerTab === "personal-expenses" && <NewExpenseHeaderAction />}
          </div>

          {hasCompanyScope && (
            <TabsContent value="company-expenses">
              <PermissionGuard requiredPermissions={[]}>
                {renderCompanyExpenseTab({
                  data: companyExpenses,
                  isLoading: isLoadingCompany,
                  isLoadingExpenses: isLoadingCompanyExpenses,
                  onFilterChange: handleFilteredCompanyDataChange,
                  scope: "company"
                })}
              </PermissionGuard>
            </TabsContent>
          )}

          {hasTeamScope && (
            <TabsContent value="team-expenses">
              <PermissionGuard requiredPermissions={[]}>
                {renderCompanyExpenseTab({
                  data: teamExpenses,
                  isLoading: isLoadingTeam,
                  isLoadingExpenses: isLoadingTeamExpenses,
                  onFilterChange: (d) => setFilteredTeamExpenses(d),
                  scope: "team"
                })}
              </PermissionGuard>
            </TabsContent>
          )}

          <TabsContent value="personal-expenses">
            {renderPersonalExpenseTab()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
