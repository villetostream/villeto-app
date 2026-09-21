"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, EyeOff, Eye, Plus, MoreHorizontal, Upload } from "lucide-react";
import { Receipt2, CalendarTick, Clock, TickCircle } from "iconsax-reactjs";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { createColumnHelper } from "@tanstack/react-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { useLegalEntities } from "@/queries/legal-entities";
import { useGetPayments, useGetBankTransactions } from "@/queries/bill-pay";
import { format } from "date-fns";

type Payment = {
  paymentId: string;
  amount: string;
  currency: string;
  status: string;
  executionDate: string;
  vendorBeneficiary: {
    name: string;
  };
  paymentRequest: {
    paymentRequestId: string;
  };
};

type BankTransaction = {
  bankTransactionId: string;
  transactionDate: string;
  description: string;
  amount: string;
  currency: string;
  type: string;
  status: string;
};

const paymentColumnHelper = createColumnHelper<Payment>();
const bankTxColumnHelper = createColumnHelper<BankTransaction>();

function PaymentsDashboard() {
  const router = useRouter();
  const policies = useAuthorizationPolicies();
  const [activeTab, setActiveTab] = useState("payments");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [showAccountDetails, setShowAccountDetails] = useState(true);

  const { data: legalEntitiesData } = useLegalEntities();
  const legalEntityId = legalEntitiesData?.data?.[0]?.legalEntityId || "a3c0738f-a024-497a-9cbf-a488dba29bf4";

  // Data Tables Props
  const paymentTableProps = useDataTable({
    initialPage: 1,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: true,
    manualPagination: true,
  });

  const bankTableProps = useDataTable({
    initialPage: 1,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: true,
    manualPagination: true,
  });

  // Queries
  const { data: paymentsData, isLoading: paymentsLoading } = useGetPayments(
    legalEntityId,
    paymentTableProps.page,
    paymentTableProps.pageSize
  );

  const { data: bankData, isLoading: bankLoading } = useGetBankTransactions(
    legalEntityId,
    bankTableProps.page,
    bankTableProps.pageSize
  );

  // Columns for Payments
  const paymentColumns = useMemo(() => [
    paymentColumnHelper.accessor("paymentId", {
      header: "PAYMENT ID",
      cell: (info) => <p className="text-[#68726d] font-medium uppercase">{info.getValue()?.split('-')[0]}</p>,
    }),
    paymentColumnHelper.accessor("vendorBeneficiary.name", {
      header: "BENEFICIARY",
      cell: (info) => <p className="font-semibold text-[#0b100e]">{info.getValue() || "N/A"}</p>,
    }),
    paymentColumnHelper.accessor("amount", {
      header: "AMOUNT",
      cell: (info) => <p className="font-bold text-[#0b100e]">₦{parseFloat(info.getValue() || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>,
    }),
    paymentColumnHelper.accessor("executionDate", {
      header: "EXECUTION DATE",
      cell: (info) => <p className="text-[#68726d]">{info.getValue() ? format(new Date(info.getValue()), "dd MMM yyyy") : "N/A"}</p>,
    }),
    paymentColumnHelper.accessor("status", {
      header: "STATUS",
      cell: (info) => {
        const status = info.getValue()?.toLowerCase() || "";
        let variant: "pending" | "approved" | "default" | "rejected" = "default";
        if (["externally_recorded", "reconciled"].includes(status)) variant = "approved";
        if (status === "failed") variant = "rejected";
        return <StatusBadge status={variant} label={status.replace(/_/g, ' ')} className="capitalize" />;
      },
    }),
    paymentColumnHelper.display({
      id: "actions",
      header: "ACTION",
      enableHiding: false,
      cell: () => (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#68726d] hover:text-[#0b100e]">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      ),
    }),
  ], []);

  // Columns for Bank Transactions
  const bankColumns = useMemo(() => [
    bankTxColumnHelper.accessor("transactionDate", {
      header: "DATE",
      cell: (info) => <p className="text-[#68726d] font-medium">{info.getValue() ? format(new Date(info.getValue()), "dd MMM yyyy") : "N/A"}</p>,
    }),
    bankTxColumnHelper.accessor("description", {
      header: "DESCRIPTION",
      cell: (info) => <p className="font-semibold text-[#0b100e] max-w-xs truncate" title={info.getValue()}>{info.getValue()}</p>,
    }),
    bankTxColumnHelper.accessor("type", {
      header: "TYPE",
      cell: (info) => <p className="text-[#68726d] uppercase text-xs font-bold tracking-wider">{info.getValue()}</p>,
    }),
    bankTxColumnHelper.accessor("amount", {
      header: "AMOUNT",
      cell: (info) => <p className="font-bold text-[#0b100e]">₦{parseFloat(info.getValue() || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>,
    }),
    bankTxColumnHelper.accessor("status", {
      header: "STATUS",
      cell: (info) => {
        const status = info.getValue()?.toLowerCase() || "";
        let variant: "pending" | "approved" | "default" = "default";
        if (status === "matched") variant = "approved";
        if (status === "unmatched") variant = "pending";
        return <StatusBadge status={variant} label={status} className="capitalize" />;
      },
    }),
    bankTxColumnHelper.display({
      id: "actions",
      header: "ACTION",
      enableHiding: false,
      cell: () => (
        <Button variant="ghost" size="sm" className="h-8 text-[#087f70] hover:text-[#076b5e] font-semibold border border-[#087f70]/20 hover:bg-[#087f70]/10 rounded-md">
          Match
        </Button>
      ),
    }),
  ], []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const displayPayments = useMemo(() => {
    let data = (paymentsData as any)?.data || [];
    if (paymentStatusFilter !== "all") {
      data = data.filter((p: Payment) => p.status?.toLowerCase() === paymentStatusFilter);
    }
    if (paymentTableProps.globalSearch) {
      const q = paymentTableProps.globalSearch.toLowerCase();
      data = data.filter((p: Payment) => 
        p.vendorBeneficiary?.name?.toLowerCase().includes(q) || 
        p.paymentId?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [paymentsData, paymentStatusFilter, paymentTableProps.globalSearch]);

  const displayBankTx = useMemo(() => {
    let data = (bankData as any)?.data || [];
    if (bankTableProps.globalSearch) {
      const q = bankTableProps.globalSearch.toLowerCase();
      data = data.filter((b: BankTransaction) => 
        b.description?.toLowerCase().includes(q) ||
        b.amount?.includes(q)
      );
    }
    return data;
  }, [bankData, bankTableProps.globalSearch]);

  return (
    <div className="flex flex-col h-full pb-2 overflow-y-auto">
      <div className="space-y-6 flex-1 flex flex-col min-h-[600px]">
        
        {/* Top Account Details Section */}
        {policies.billPay.canViewSensitivePayment && showAccountDetails ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
        
        {/* Left White Card */}
        <div className="col-span-2 rounded-[16px] border border-black/[0.08] bg-white p-6 flex flex-col sm:flex-row justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-bold text-[#68726d] tracking-wider mb-1 uppercase">MAIN ACCOUNT</p>
              <h3 className="text-lg font-bold text-[#0b100e]">Villeto Bank Account</h3>
            </div>
            <Button className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-10 px-5 font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Funds
            </Button>
          </div>
          <div className="flex flex-col items-end justify-between mt-4 sm:mt-0">
            <div className="text-right">
              <p className="text-[13px] text-[#68726d] font-medium mb-1">Available Balance</p>
              <h2 className="text-[32px] font-bold text-[#0b100e] leading-none">₦150,674.00</h2>
            </div>
            <div className="flex items-center gap-3 bg-[#f5f7f6] px-4 py-2 rounded-full mt-4">
              <span className="text-[14px] font-semibold text-[#0b100e]">12345678900</span>
              <button 
                onClick={() => copyToClipboard("12345678900")}
                className="text-[#087f70] flex items-center gap-1.5 text-[13px] font-bold hover:text-[#076b5e] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Right Gradient Card */}
        <div className="col-span-1 rounded-[16px] bg-gradient-to-br from-[#8b5cf6] to-[#d946ef] p-6 text-white relative overflow-hidden flex flex-col justify-between">
          {/* Decorative shapes */}
          <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full border border-white/20 pointer-events-none" />
          <div className="absolute -bottom-12 -right-4 w-32 h-32 rounded-full border border-white/20 pointer-events-none" />
          
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center shrink-0">
                <span className="font-bold text-[14px] italic">V</span>
              </div>
              <span className="font-bold tracking-wide">Villeto</span>
            </div>
            <button onClick={() => setShowAccountDetails(false)} className="text-white/80 hover:text-white transition-colors">
              <EyeOff className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 relative z-10">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold mb-1">CARD NUMBER</p>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold tracking-[0.1em]">1234 5678 9012 2345</p>
                <button onClick={() => copyToClipboard("1234567890122345")} className="text-white/60 hover:text-white transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-10">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold mb-1">EXPIRY DATE</p>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold">13/10</p>
                  <button className="text-white/60 hover:text-white transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold mb-1">CVV</p>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold">272</p>
                  <button className="text-white/60 hover:text-white transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>
      ) : policies.billPay.canViewSensitivePayment ? (
        <div className="flex justify-end shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAccountDetails(true)} 
            className="text-[#087f70] hover:text-[#076b5e] hover:bg-[#087f70]/10 font-semibold"
          >
            <Eye className="w-4 h-4 mr-2" /> Show Account Details
          </Button>
        </div>
      ) : null}

      {/* Stats Cards (Mocked for now since no aggregation API exists) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
        <StatsCard
          title="Awaiting Authorization"
          value="₦12,850,000"
          subtitle={<span className="text-[11px] text-[#68726d]">Authorize payments</span>}
          icon={<Receipt2 variant="Bulk" className="w-5 h-5 text-[#087f70]" />}
          accentColor="#087f70"
          trend="neutral"
        />
        <StatsCard
          title="Scheduled"
          value="7"
          subtitle={<span className="text-[11px] text-[#68726d]">₦14,250,000</span>}
          icon={<CalendarTick variant="Bulk" className="w-5 h-5 text-[#f59e0b]" />}
          accentColor="#f59e0b"
          trend="neutral"
        />
        <StatsCard
          title="Processing"
          value="4"
          subtitle={<span className="text-[11px] text-[#68726d]">In progress</span>}
          icon={<Clock variant="Bulk" className="w-5 h-5 text-[#9333ea]" />}
          accentColor="#9333ea"
          trend="neutral"
        />
        <StatsCard
          title="Completed This Month"
          value="23"
          subtitle={<span className="text-[11px] text-[#68726d]">₦52,300,000</span>}
          icon={<TickCircle variant="Bulk" className="w-5 h-5 text-[#087f70]" />}
          accentColor="#087f70"
          trend="neutral"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-[500px] mt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide shrink-0">
            <TabsTrigger 
              value="payments" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
            >
              Ledger Payments
            </TabsTrigger>
            <TabsTrigger 
              value="bank" 
              className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
            >
              Bank Transactions
            </TabsTrigger>
          </TabsList>
          
          {activeTab === "bank" && policies.billPay.canManageReconciliation && (
            <Button className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-9 px-4 font-semibold text-[13px] flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import Statement
            </Button>
          )}
        </div>
        
        {/* Payments Tab Content */}
        <TabsContent value="payments" className="flex-1 flex flex-col min-h-0 mt-4 border-none outline-none">
          {/* Sub-filter tabs */}
          <div className="mb-4">
            <Tabs value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide shrink-0">
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center">All Payments</TabsTrigger>
                <TabsTrigger value="externally_recorded" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center">Externally Recorded</TabsTrigger>
                <TabsTrigger value="reconciled" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center">Reconciled</TabsTrigger>
                <TabsTrigger value="failed" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center">Failed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 overflow-hidden">
            <DataTable
              data={displayPayments}
              isLoading={paymentsLoading}
              manualPagination={true}
              columns={paymentColumns as any}
              paginationProps={{
                ...paymentTableProps.paginationProps,
                total: (paymentsData as any)?.meta?.totalCount || displayPayments.length,
              }}
              enableRowSelection={false}
              enableColumnVisibility={false}
              selectedDataIds={paymentTableProps.selectedDataIds}
              setSelectedDataIds={paymentTableProps.setSelectedDataIds}
              tableHeader={{
                actionButton: <></>,
                isSearchable: true,
                isExportable: true,
                isFilter: false,
                enableColumnVisibility: false,
                search: paymentTableProps.globalSearch,
                searchQuery: paymentTableProps.setGlobalSearch,
                filterProps: { title: "Filter", filterData: [], onFilter: () => paymentTableProps.setPage(1) },
                bulkActions: [],
              }}
            />
          </div>
        </TabsContent>

        {/* Bank Transactions Tab Content */}
        <TabsContent value="bank" className="flex-1 flex flex-col min-h-0 mt-4 border-none outline-none">
          <div className="flex-1 overflow-hidden">
            <DataTable
              data={displayBankTx}
              isLoading={bankLoading}
              manualPagination={true}
              columns={bankColumns as any}
              paginationProps={{
                ...bankTableProps.paginationProps,
                total: (bankData as any)?.meta?.totalCount || displayBankTx.length,
              }}
              enableRowSelection={false}
              enableColumnVisibility={false}
              selectedDataIds={bankTableProps.selectedDataIds}
              setSelectedDataIds={bankTableProps.setSelectedDataIds}
              tableHeader={{
                actionButton: <></>,
                isSearchable: true,
                isExportable: false,
                isFilter: false,
                enableColumnVisibility: false,
                search: bankTableProps.globalSearch,
                searchQuery: bankTableProps.setGlobalSearch,
                filterProps: { title: "Filter", filterData: [], onFilter: () => bankTableProps.setPage(1) },
                bulkActions: [],
              }}
            />
          </div>
        </TabsContent>

      </Tabs>
      </div>
    </div>
  );
}

export default withPermissions(PaymentsDashboard, [
  { resource: "bill_pay.payment_request", action: "view" },
  { resource: "bill_pay.payment", action: "view" },
]);
