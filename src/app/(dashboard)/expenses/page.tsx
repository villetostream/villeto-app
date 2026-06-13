"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NewExpenseHeaderAction from "@/components/expenses/NewExpenseHeaderAction";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import ExpenseTable from "@/components/expenses/table/ExpenseTable";
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
import type { ColumnDef } from "@tanstack/react-table";

type ExpenseTableRow = Record<string, unknown> & {
  status?: string;
  reportId?: string;
  reportName?: string;
  date?: string;
  category?: string;
  amount?: number | string;
};

export default function Reimbursements() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const can = useAuthStore((state) => state.can);
  const authReady = useAuthStore((state) => !state.isLoading);

  // ── Scope derivation (safe: false until auth is ready) ───────────────────
  const hasTeamScope    = authReady && can("expense.report", "read_department");
  const hasCompanyScope = authReady && can("expense.report", "read_company");

  // ── Outer tab list (recalculated once auth is ready) ─────────────────────
  const outerTabs = useMemo(() => [
    ...(hasCompanyScope ? [{ key: "company-expenses", label: "Company Expenses" }] : []),
    ...(hasTeamScope    ? [{ key: "team-expenses",    label: "Team Expenses"    }] : []),
    { key: "personal-expenses", label: "My Expenses" },
  ], [hasCompanyScope, hasTeamScope]);

  const _defaultOuterTab = outerTabs[0]?.key ?? "personal-expenses";

  const tabFromUrl = searchParams.get("tab");
  const outerTab = useMemo(() => {
    if (!authReady) {
      return tabFromUrl ?? "personal-expenses";
    }
    if (tabFromUrl && outerTabs.some(t => t.key === tabFromUrl)) {
      return tabFromUrl;
    }
    return outerTabs[0]?.key ?? "personal-expenses";
  }, [authReady, tabFromUrl, outerTabs]);

  useEffect(() => {
    if (!authReady) return;
    const valid = !tabFromUrl || outerTabs.some(t => t.key === tabFromUrl);
    if (!valid && outerTabs[0]) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", outerTabs[0].key);
      router.replace(`/expenses?${params.toString()}`, { scroll: false });
    }
  }, [authReady, tabFromUrl, outerTabs, searchParams, router]);

  // ── Separate status-filter state per scope tab ───────────────────────────
  const [companyActiveTab, setCompanyActiveTab] = useState("all");
  const [teamActiveTab,    setTeamActiveTab]    = useState("all");
  const [personalActiveTab, setPersonalActiveTab] = useState("all");
  
  const noopFilterChange = useCallback((_d: unknown) => {}, []);

  // ── Pagination ────────────────────────────────────────────────────────────
  const pageParam = searchParams.get("page");
  const page = useMemo(() => {
    if (pageParam && /^\d+$/.test(pageParam)) {
      return Math.max(1, parseInt(pageParam, 10));
    }
    return 1;
  }, [pageParam]);
  const [limit] = useState(100);

  // Persist current tab + page for back-navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("expensesReturnTab", outerTab);
    sessionStorage.setItem("expensesReturnPage", String(page));
  }, [outerTab, page]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    if (value === "personal-expenses" && page > 1) {
      params.set("page", String(page));
    } else if (value !== "personal-expenses") {
      params.delete("page");
    }
    router.replace(`/expenses?${params.toString()}`, { scroll: false });
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const { data: personalExpensesData, isLoading: isLoadingPersonalExpenses } =
    usePersonalExpenses(page, limit);

  const { data: companyExpensesData, isLoading: isLoadingCompanyExpenses } =
    useCompanyExpenses(page, limit, "company", undefined, undefined, hasCompanyScope);

  const { data: teamExpensesData, isLoading: isLoadingTeamExpenses } =
    useCompanyExpenses(page, limit, "team", undefined, undefined, hasTeamScope);

  const isLoadingCompany = isLoadingCompanyExpenses && hasCompanyScope;
  const isLoadingTeam    = isLoadingTeamExpenses    && hasTeamScope;

  const personalExpenses = useMemo<PersonalExpenseRow[]>(() => {
    if (!personalExpensesData?.reports) return [];
    const sorted = [...personalExpensesData.reports].sort((a, b) =>
      Math.max(new Date(b.createdAt).getTime(), new Date(b.updatedAt).getTime()) -
      Math.max(new Date(a.createdAt).getTime(), new Date(a.updatedAt).getTime()),
    );
    return sorted.map(r => ({
      date: formatDate(r.createdAt),
      reportName: r.reportTitle,
      category: r.costCenter?.trim() || "Uncategorized",
      amount: r.totalAmount,
      status: r.status,
      reportId: r.reportId,
    }));
  }, [personalExpensesData]);

  const companyExpenses = useMemo<CompanyExpenseReport[]>(() => {
    if (!companyExpensesData?.reports) return [];
    return [...companyExpensesData.reports].sort((a, b) =>
      Math.max(new Date(b.createdAt).getTime(), new Date(b.updatedAt).getTime()) -
      Math.max(new Date(a.createdAt).getTime(), new Date(a.updatedAt).getTime()),
    );
  }, [companyExpensesData]);

  const teamExpenses = useMemo<CompanyExpenseReport[]>(() => {
    if (!teamExpensesData?.reports) return [];
    return [...teamExpensesData.reports].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [teamExpensesData]);

  // ── Stats helpers ─────────────────────────────────────────────────────────
  const calculateStats = (data: CompanyExpenseReport[]) => ({
    totalExpenses:    data.length,
    pendingApprovals: data.filter(i => i.status === "pending").length,
    approvedExpenses: data.filter(i => i.status === "approved" || i.status === "paid").length,
    paidExpenses:     data.filter(i => i.status === "paid").length,
  });

  const personalStats = useMemo(() => {
    const counts = { draft: 0, approved: 0, paid: 0, rejected: 0 };
    for (const e of personalExpenses ?? []) {
      if (e.status === "draft")                              counts.draft    += 1;
      if (e.status === "approved")                          counts.approved += 1;
      if (e.status === "paid")                              counts.paid     += 1;
      // cover both spellings the API may return
      if (e.status === "declined" || e.status === "rejected") counts.rejected += 1;
    }
    return counts;
  }, [personalExpenses]);

  // ── Status filter tabs (shared definition) ────────────────────────────────
  const expenseStatusTabs = [
    { key: "all",      filter: null as string | null },
    { key: "draft",    filter: "draft" },
    { key: "pending",  filter: "pending" },
    { key: "approved", filter: "approved" },
    { key: "rejected", filter: "declined" },
    { key: "paid",     filter: "paid" },
  ];

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderCompanyExpenseTab = ({
    data,
    isLoading,
    isLoadingExpenses,
    onFilterChange,
    scope,
    activeTab,
    setActiveTab,
  }: {
    data: CompanyExpenseReport[];
    isLoading: boolean;
    isLoadingExpenses: boolean;
    onFilterChange: (d: unknown) => void;
    scope: "team" | "company";
    activeTab: string;
    setActiveTab: (v: string) => void;
  }) => {
    const localStats = calculateStats(data);
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
          <StatsCard isLoading={isLoadingExpenses} title="Total Expenses" value={localStats.totalExpenses.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#384A57] rounded-full"><Image src="/images/svgs/draft.svg" alt="draft icon" width={20} height={20} /></div>}
            subtitle={<span className="text-xs leading-[125%]">All expenses submitted</span>} />
          <StatsCard isLoading={isLoadingExpenses} title="Pending Approvals" value={localStats.pendingApprovals.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#F45B69] rounded-full text-white"><Image src="/images/receipt-pending.png" alt="pending icon" width={20} height={20} /></div>}
            subtitle={<span className="text-xs leading-[125%]">Awaiting review.</span>} />
          <StatsCard isLoading={isLoadingExpenses} title="Approved Expenses" value={localStats.approvedExpenses.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#5A67D8] rounded-full"><Image src="/images/svgs/submitted.svg" alt="submitted icon" width={20} height={20} /></div>}
            subtitle={<span className="text-xs leading-[125%]">Ready for payment</span>} />
          <StatsCard isLoading={isLoadingExpenses} title="Paid" value={localStats.paidExpenses.toString()}
            icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#38B2AC] rounded-full text-white"><Image src="/images/svgs/money.svg" alt="money icon" width={20} height={20} /></div>}
            subtitle={<span className="text-xs leading-[125%]">Completed transactions</span>} />
        </div>
        {!authReady || isLoading ? (
          <PersonalExpensesSkeleton showStats={false} />
        ) : data.length === 0 ? (
          <ExpenseEmptyState title="No expense has been added" subtitle="" showButton={false} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                  data={data as unknown as ExpenseTableRow[]}
                  columnsOverride={getCompanyColumns(scope) as ColumnDef<ExpenseTableRow>[]}
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
        <StatsCard isLoading={isLoadingPersonalExpenses} title="Draft" value={personalStats.draft.toString()}
          icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#384A57] rounded-full"><Image src="/images/svgs/draft.svg" alt="draft icon" width={20} height={20} /></div>}
          subtitle={<span className="text-xs leading-[125%]">Manage your saved items</span>} />
        <StatsCard isLoading={isLoadingPersonalExpenses} title="Approved" value={personalStats.approved.toString()}
          icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#418341] rounded-full text-white"><Image src="/images/svgs/check.svg" alt="check icon" width={20} height={20} /></div>}
          subtitle={<span className="text-xs leading-[125%]">View all items reviewed.</span>} />
        <StatsCard isLoading={isLoadingPersonalExpenses} title="Rejected" value={personalStats.rejected.toString()}
          icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#F45B69] rounded-full text-white"><Image src="/images/receipt-pending.png" alt="pending icon" width={20} height={20} /></div>}
          subtitle={<span className="text-xs leading-[125%]">View all items Rejected.</span>} />
        <StatsCard isLoading={isLoadingPersonalExpenses} title="Paid" value={personalStats.paid.toString()}
          icon={<div className="p-1 mr-3 flex items-center justify-center bg-[#38B2AC] rounded-full text-white"><Image src="/images/svgs/money.svg" alt="money icon" width={20} height={20} /></div>}
          subtitle={<span className="text-xs leading-[125%]">Access completed payments.</span>} />
      </div>
      {!authReady || isLoadingPersonalExpenses ? (
        <PersonalExpensesSkeleton showStats={false} />
      ) : personalExpenses.length === 0 ? (
        <ExpenseEmptyState />
      ) : (
        <Tabs value={personalActiveTab} onValueChange={setPersonalActiveTab}>
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
                statusFilter={t.filter}
                data={personalExpenses as ExpenseTableRow[]}
                columnsOverride={personalExpenseColumns as ColumnDef<ExpenseTableRow>[]}
                page={page}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const isPersonalOnly = !hasCompanyScope && !hasTeamScope;

  return (
    <div style={{ maxHeight: "100%" }}>
      {isPersonalOnly ? (
        // Own-scope only: no tabs, no "My Expenses" heading (moved to user-section)
        <div className="space-y-8">
          {/* NewExpenseHeaderAction registers the CTA into the header store */}
          <NewExpenseHeaderAction />
          {renderPersonalExpenseTab()}
        </div>
      ) : (
        <Tabs value={outerTab} onValueChange={handleTabChange}>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
            <TabsList>
              {outerTabs.map(t => (
                <TabsTrigger key={t.key} value={t.key} className="cursor-pointer">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {outerTab === "personal-expenses" && <NewExpenseHeaderAction />}
          </div>

          {hasCompanyScope && (
            <TabsContent value="company-expenses">
              {renderCompanyExpenseTab({
                data: companyExpenses,
                isLoading: isLoadingCompany,
                isLoadingExpenses: isLoadingCompanyExpenses,
                onFilterChange: noopFilterChange,
                scope: "company",
                activeTab: companyActiveTab,
                setActiveTab: setCompanyActiveTab,
              })}
            </TabsContent>
          )}

          {hasTeamScope && (
            <TabsContent value="team-expenses">
              {renderCompanyExpenseTab({
                data: teamExpenses,
                isLoading: isLoadingTeam,
                isLoadingExpenses: isLoadingTeamExpenses,
                onFilterChange: noopFilterChange,
                scope: "team",
                activeTab: teamActiveTab,
                setActiveTab: setTeamActiveTab,
              })}
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