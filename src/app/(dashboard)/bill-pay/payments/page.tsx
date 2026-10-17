"use client";
import { useTransactionLegalEntities } from "@/features/entity-workspace/hooks";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { createColumnHelper } from "@tanstack/react-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import withPermissions from "@/components/permissions/permission-protected-routes";

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
  // Expected by Figma
  billId?: string;
  vendorName?: string;
  dueDate?: string;
  paymentMethod?: string;
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
  const [activeTab, setActiveTab] = useState("payments");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  const { data: legalEntitiesData } = useTransactionLegalEntities("finance");
  const legalEntityId = legalEntitiesData?.data?.[0]?.legalEntityId || "";

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
  const { data: paymentsData, isLoading: paymentsLoading, isError: paymentsError } = useGetPayments(
    legalEntityId,
    paymentTableProps.page,
    paymentTableProps.pageSize,
  );

  const { data: bankData, isLoading: bankLoading, isError: bankError } = useGetBankTransactions(
    legalEntityId,
    bankTableProps.page,
    bankTableProps.pageSize,
  );

  // Columns for Payments
  const paymentColumns = useMemo(
    () => [
      paymentColumnHelper.accessor("paymentId", {
        header: "BILL ID",
        cell: (info) => {
          const row = info.row.original;
          const displayId =
            row.billId ||
            `INV-${info.getValue()?.split("-")[0].toUpperCase().slice(0, 4)}`;
          return <p className="text-[#68726d] font-medium">{displayId}</p>;
        },
      }),
      paymentColumnHelper.accessor("vendorBeneficiary.name", {
        header: "VENDOR",
        cell: (info) => {
          const row = info.row.original;
          return (
            <p className="font-semibold text-[#0b100e]">
              {row.vendorName || info.getValue() || "N/A"}
            </p>
          );
        },
      }),
      paymentColumnHelper.accessor("amount", {
        header: "AMOUNT",
        cell: (info) => (
          <p className="font-bold text-[#0b100e]">
            {new Intl.NumberFormat("en-NG", { style: "currency", currency: info.row.original.currency || "NGN" }).format(parseFloat(info.getValue() || "0"))}
          </p>
        ),
      }),
      paymentColumnHelper.accessor("dueDate", {
        header: "DUE DATE",
        cell: (info) => {
          const val = info.getValue();
          return (
            <p className="text-[#68726d]">
              {val ? format(new Date(val), "dd MMM yyyy") : "—"}
            </p>
          );
        },
      }),
      paymentColumnHelper.accessor("paymentMethod", {
        header: "METHOD",
        cell: (info) => (
          <p className="text-[#68726d] capitalize">
            {info.getValue() || "—"}
          </p>
        ),
      }),
      paymentColumnHelper.accessor("status", {
        header: "STATUS",
        cell: (info) => {
          const status = info.getValue()?.toLowerCase() || "";
          // Figma statuses: Draft, Awaiting Authorization, Scheduled, Processing, Completed, Returned
          // Map backend statuses to Figma
          let displayStatus = status;
          let variant: "pending" | "approved" | "default" | "rejected" =
            "default";

          if (
            ["externally_recorded", "reconciled", "completed"].includes(status)
          ) {
            variant = "approved";
            displayStatus = "Completed";
          } else if (["failed", "returned", "rejected"].includes(status)) {
            variant = "rejected";
            displayStatus = "Returned";
          } else if (["scheduled"].includes(status)) {
            variant = "pending";
            displayStatus = "Scheduled";
          } else if (["processing", "in_progress"].includes(status)) {
            variant = "pending";
            displayStatus = "Processing";
          } else if (
            ["awaiting_authorization", "pending_approval", "pending"].includes(
              status,
            )
          ) {
            variant = "pending"; // Use custom amber if needed
            displayStatus = "Awaiting Authorization";
          } else if (["draft"].includes(status)) {
            variant = "default";
            displayStatus = "Draft";
          }

          if (displayStatus === "Awaiting Authorization") {
            return (
              <StatusBadge
                status="awaiting_authorization"
                label="Awaiting Authorization"
              />
            );
          }
          if (displayStatus === "Scheduled") {
            return (
              <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-semibold px-2 py-1 bg-[#fefce8] text-[#ca8a04] border border-[#fef08a]">
                Scheduled
              </span>
            );
          }
          if (displayStatus === "Processing") {
            return (
              <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-semibold px-2 py-1 bg-[#f3e8ff] text-[#9333ea] border border-[#e9d5ff]">
                Processing
              </span>
            );
          }

          return (
            <StatusBadge
              status={variant}
              label={displayStatus}
              className="capitalize"
            />
          );
        },
      }),
      paymentColumnHelper.accessor("executionDate", {
        header: "PAYMENT DATE",
        cell: (info) => (
          <p className="text-[#68726d]">
            {info.getValue()
              ? format(new Date(info.getValue()), "dd MMM yyyy")
              : "—"}
          </p>
        ),
      }),
    ],
    [],
  );

  // Columns for Bank Transactions
  const bankColumns = useMemo(
    () => [
      bankTxColumnHelper.accessor("transactionDate", {
        header: "DATE",
        cell: (info) => (
          <p className="text-[#68726d] font-medium">
            {info.getValue()
              ? format(new Date(info.getValue()), "dd MMM yyyy")
              : "N/A"}
          </p>
        ),
      }),
      bankTxColumnHelper.accessor("description", {
        header: "DESCRIPTION",
        cell: (info) => (
          <p
            className="font-semibold text-[#0b100e] max-w-xs truncate"
            title={info.getValue()}
          >
            {info.getValue()}
          </p>
        ),
      }),
      bankTxColumnHelper.accessor("type", {
        header: "TYPE",
        cell: (info) => (
          <p className="text-[#68726d] uppercase text-xs font-bold tracking-wider">
            {info.getValue()}
          </p>
        ),
      }),
      bankTxColumnHelper.accessor("amount", {
        header: "AMOUNT",
        cell: (info) => (
          <p className="font-bold text-[#0b100e]">
            {new Intl.NumberFormat("en-NG", { style: "currency", currency: info.row.original.currency || "NGN" }).format(parseFloat(info.getValue() || "0"))}
          </p>
        ),
      }),
      bankTxColumnHelper.accessor("status", {
        header: "STATUS",
        cell: (info) => {
          const status = info.getValue()?.toLowerCase() || "";
          let variant: "pending" | "approved" | "default" = "default";
          if (status === "matched") variant = "approved";
          if (status === "unmatched") variant = "pending";
          return (
            <StatusBadge
              status={variant}
              label={status}
              className="capitalize"
            />
          );
        },
      }),
    ],
    [],
  );

  const displayPayments = useMemo(() => {
    let data = (paymentsData as any)?.data || [];
    if (paymentStatusFilter !== "all") {
      data = data.filter((p: Payment) => {
        const status = p.status?.toLowerCase() || "";
        const expected = paymentStatusFilter.toLowerCase();

        if (
          expected === "completed" &&
          ["externally_recorded", "reconciled", "completed"].includes(status)
        )
          return true;
        if (
          expected === "returned" &&
          ["failed", "returned", "rejected"].includes(status)
        )
          return true;
        if (expected === "scheduled" && status === "scheduled") return true;
        if (
          expected === "processing" &&
          ["processing", "in_progress"].includes(status)
        )
          return true;
        if (
          expected === "awaiting_authorization" &&
          ["awaiting_authorization", "pending_approval", "pending"].includes(
            status,
          )
        )
          return true;
        if (expected === "draft" && status === "draft") return true;

        return false;
      });
    }
    if (paymentTableProps.globalSearch) {
      const q = paymentTableProps.globalSearch.toLowerCase();
      data = data.filter(
        (p: Payment) =>
          p.vendorBeneficiary?.name?.toLowerCase().includes(q) ||
          p.paymentId?.toLowerCase().includes(q),
      );
    }
    return data;
  }, [paymentsData, paymentStatusFilter, paymentTableProps.globalSearch]);

  const displayBankTx = useMemo(() => {
    let data = (bankData as any)?.data || [];
    if (bankTableProps.globalSearch) {
      const q = bankTableProps.globalSearch.toLowerCase();
      data = data.filter(
        (b: BankTransaction) =>
          b.description?.toLowerCase().includes(q) || b.amount?.includes(q),
      );
    }
    return data;
  }, [bankData, bankTableProps.globalSearch]);

  return (
    <div className="flex flex-col h-full pb-2 overflow-y-auto">
      <div className="space-y-6 flex-1 flex flex-col min-h-[600px]">
        <div className="rounded-[12px] border border-black/[0.08] bg-white p-4 text-sm text-[#68726d]">
          Funding balances and payment totals are not available in this view. The ledger below shows recorded payments for the selected workspace.
        </div>

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-[500px] mt-2"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide shrink-0 border border-black/[0.05]">
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

          </div>

          {/* Payments Tab Content */}
          <TabsContent
            value="payments"
            className="flex-1 flex flex-col min-h-0 mt-4 border-none outline-none"
          >
            {/* Sub-filter tabs */}
            <div className="mb-4">
              <Tabs
                value={paymentStatusFilter}
                onValueChange={setPaymentStatusFilter}
              >
                <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide shrink-0">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
                  >
                    All Payments
                  </TabsTrigger>
                  <TabsTrigger
                    value="draft"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
                  >
                    Draft
                  </TabsTrigger>
                  <TabsTrigger
                    value="awaiting_authorization"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
                  >
                    Awaiting Authorization
                  </TabsTrigger>
                  <TabsTrigger
                    value="scheduled"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
                  >
                    Scheduled
                  </TabsTrigger>
                  <TabsTrigger
                    value="processing"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
                  >
                    Processing
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
                  >
                    Completed
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex-1 overflow-hidden">
              {paymentsError && <p role="alert" className="p-4 text-sm text-red-700">Payments could not be loaded for this workspace.</p>}
              <DataTable
                data={displayPayments}
                isLoading={paymentsLoading}
                manualPagination={true}
                columns={paymentColumns as any}
                paginationProps={{
                  ...paymentTableProps.paginationProps,
                  total:
                    (paymentsData as any)?.meta?.totalCount ||
                    displayPayments.length,
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
                  filterProps: {
                    title: "Filter",
                    filterData: [],
                    onFilter: () => paymentTableProps.setPage(1),
                  },
                  bulkActions: [],
                }}
              />
            </div>
          </TabsContent>

          {/* Bank Transactions Tab Content */}
          <TabsContent
            value="bank"
            className="flex-1 flex flex-col min-h-0 mt-4 border-none outline-none"
          >
            <div className="flex-1 overflow-hidden">
              {bankError && <p role="alert" className="p-4 text-sm text-red-700">Bank transactions could not be loaded for this workspace.</p>}
              <DataTable
                data={displayBankTx}
                isLoading={bankLoading}
                manualPagination={true}
                columns={bankColumns as any}
                paginationProps={{
                  ...bankTableProps.paginationProps,
                  total:
                    (bankData as any)?.meta?.totalCount || displayBankTx.length,
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
                  filterProps: {
                    title: "Filter",
                    filterData: [],
                    onFilter: () => bankTableProps.setPage(1),
                  },
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
