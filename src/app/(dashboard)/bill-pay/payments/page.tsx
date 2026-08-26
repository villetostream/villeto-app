"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, EyeOff, Eye, Search, Plus, MoreHorizontal } from "lucide-react";
import { Receipt2, CalendarTick, Clock, TickCircle } from "iconsax-reactjs";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";

type Payment = {
  id: string;
  vendor: string;
  amount: string;
  dueDate: string;
  method: string;
  status: string;
  paymentDate: string;
};

const mockPayments: Payment[] = [
  { id: "INV-2024", vendor: "Acme Ltd", amount: "₦4,200,000.00", dueDate: "10 Sept 2025", method: "Bank Transfer", status: "Draft", paymentDate: "10 Sept 2025" },
  { id: "INV-2024-2", vendor: "Delta Services", amount: "₦4,200,000.00", dueDate: "10 Sept 2025", method: "Bank Transfer", status: "Scheduled", paymentDate: "10 Sept 2025" },
  { id: "INV-2024-3", vendor: "Nova Tech", amount: "₦4,200,000.00", dueDate: "10 Sept 2025", method: "Card", status: "Paid", paymentDate: "10 Sept 2025" },
  { id: "INV-2024-4", vendor: "Zenith Corp", amount: "₦4,200,000.00", dueDate: "10 Sept 2025", method: "Bank Transfer", status: "Processing", paymentDate: "10 Sept 2025" },
  { id: "INV-2024-5", vendor: "Delta Services", amount: "₦4,200,000.00", dueDate: "10 Sept 2025", method: "Bank Transfer", status: "Paid", paymentDate: "10 Sept 2025" },
  { id: "INV-2024-6", vendor: "Pinnacle Ltd", amount: "₦4,200,000.00", dueDate: "10 Sept 2025", method: "Card", status: "Awaiting Authorization", paymentDate: "10 Sept 2025" },
  { id: "INV-2024-7", vendor: "Delta Services", amount: "₦4,200,000.00", dueDate: "10 Sept 2025", method: "Bank Transfer", status: "Returned", paymentDate: "10 Sept 2025" },
  { id: "INV-2024-8", vendor: "Atlas Partners", amount: "₦4,200,000.00", dueDate: "10 Sept 2025", method: "Bank Transfer", status: "Returned", paymentDate: "10 Sept 2025" },
];

const columnHelper = createColumnHelper<Payment>();

function PaymentsDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [showAccountDetails, setShowAccountDetails] = useState(true);

  const tableprops = useDataTable({
    initialPage: 1,
    totalItems: mockPayments.length,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: "BILL ID",
      cell: (info) => <p className="text-[#68726d] font-medium">{info.getValue()}</p>,
    }),
    columnHelper.accessor("vendor", {
      header: "VENDOR",
      cell: (info) => <p className="font-semibold text-[#0b100e]">{info.getValue()}</p>,
    }),
    columnHelper.accessor("amount", {
      header: "AMOUNT",
      cell: (info) => <p className="font-bold text-[#0b100e]">{info.getValue()}</p>,
    }),
    columnHelper.accessor("dueDate", {
      header: "DUE DATE",
      cell: (info) => <p className="text-[#68726d]">{info.getValue()}</p>,
    }),
    columnHelper.accessor("method", {
      header: "METHOD",
      cell: (info) => <p className="text-[#68726d]">{info.getValue()}</p>,
    }),
    columnHelper.accessor("status", {
      header: "STATUS",
      cell: (info) => {
        const status = info.getValue().toLowerCase();
        const s = status === "awaiting authorization" ? "awaiting_authorization" : status;
        return <StatusBadge status={s} />;
      },
    }),
    columnHelper.accessor("paymentDate", {
      header: "PAYMENT DATE",
      cell: (info) => <p className="text-[#68726d]">{info.getValue()}</p>,
    }),
    columnHelper.display({
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const filteredData = useMemo(() => {
    let data = mockPayments;
    if (activeTab !== "all") {
      data = data.filter(p => p.status.toLowerCase() === activeTab.replace("-", " "));
    }
    if (tableprops.globalSearch) {
      const q = tableprops.globalSearch.toLowerCase();
      data = data.filter(p => 
        p.vendor.toLowerCase().includes(q) || 
        p.id.toLowerCase().includes(q) ||
        p.amount.toLowerCase().includes(q)
      );
    }
    return data;
  }, [activeTab, tableprops.globalSearch]);

  return (
    <div className="flex flex-col h-full pb-2 overflow-y-auto">
      <div className="space-y-6 flex-1 flex flex-col min-h-[600px]">
        
        {/* Top Account Details Section */}
        {showAccountDetails ? (
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
      ) : (
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
      )}

      {/* Stats Cards */}
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

      {/* Tabs and Data Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-[500px] mt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide shrink-0">
            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center">All Payments</TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center">Draft</TabsTrigger>
            <TabsTrigger value="awaiting authorization" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center">Awaiting Authorization</TabsTrigger>
            <TabsTrigger value="scheduled" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center">Scheduled</TabsTrigger>
            <TabsTrigger value="processing" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center">Processing</TabsTrigger>
            <TabsTrigger value="paid" className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center">Completed</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
            <DataTable
              data={filteredData}
              manualPagination={false}
              columns={columns as any}
              paginationProps={{
                ...tableprops.paginationProps,
                total: filteredData.length,
              }}
              enableRowSelection={false}
              enableColumnVisibility={false}
              selectedDataIds={tableprops.selectedDataIds}
              setSelectedDataIds={tableprops.setSelectedDataIds}
              onRowClick={(row) => router.push(`/bill-pay/payments/${(row as Payment).id}`)}
              tableHeader={{
                actionButton: <></>,
                isSearchable: true,
                isExportable: true,
                isFilter: true,
                enableColumnVisibility: false,
                search: tableprops.globalSearch,
                searchQuery: tableprops.setGlobalSearch,
                filterProps: {
                  title: "Filter",
                  filterData: [],
                  onFilter: () => {
                    tableprops.setPage(1);
                  },
                },
                bulkActions: [],
              }}
            />
          </div>
      </Tabs>

      </div>
    </div>
  );
}

export default withPermissions(PaymentsDashboard, [
  { resource: "bill_pay.payment", action: "schedule" },
  { resource: "bill_pay.payment", action: "initiate" },
]);
