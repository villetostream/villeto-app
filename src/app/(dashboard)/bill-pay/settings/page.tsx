"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreHorizontal, Settings2 } from "lucide-react";
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
import { 
  useGetFundingAccounts, 
  useCreateFundingAccount,
  useGetApprovalRules,
  useCreateApprovalRule,
  FundingAccount,
  ApprovalRule
} from "@/queries/bill-pay";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const fundingColumnHelper = createColumnHelper<FundingAccount>();
const approvalRuleColumnHelper = createColumnHelper<ApprovalRule>();

function BillPaySettingsPage() {
  const router = useRouter();
  const policies = useAuthorizationPolicies();
  const [activeTab, setActiveTab] = useState("funding");

  const { data: legalEntitiesData } = useLegalEntities();
  const legalEntityId = legalEntitiesData?.data?.[0]?.legalEntityId || "a3c0738f-a024-497a-9cbf-a488dba29bf4";

  // Modals state
  const [showAddFunding, setShowAddFunding] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);

  // Form states for Funding Account
  const [fundingName, setFundingName] = useState("");
  const [accountType, setAccountType] = useState("Current");
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [externalReference, setExternalReference] = useState("");

  // Form states for Approval Rule
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [reqApprovals, setReqApprovals] = useState("1");
  const [reqDistinct, setReqDistinct] = useState(true);

  // Data Tables Props
  const fundingTableProps = useDataTable({
    initialPage: 1,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: true,
    manualPagination: true,
  });

  const ruleTableProps = useDataTable({
    initialPage: 1,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: true,
    manualPagination: true,
  });

  // Queries
  const { data: fundingData, isLoading: fundingLoading } = useGetFundingAccounts(
    legalEntityId,
    fundingTableProps.page,
    fundingTableProps.pageSize
  );

  const { data: rulesData, isLoading: rulesLoading } = useGetApprovalRules(
    legalEntityId,
    ruleTableProps.page,
    ruleTableProps.pageSize
  );

  const createFundingMutation = useCreateFundingAccount();
  const createRuleMutation = useCreateApprovalRule();

  const handleCreateFunding = async () => {
    try {
      await createFundingMutation.mutateAsync({
        legalEntityId,
        name: fundingName,
        accountType,
        maskedIdentifier,
        externalReference,
        currency: "NGN",
      });
      toast.success("Funding account created successfully");
      setShowAddFunding(false);
      setFundingName("");
      setMaskedIdentifier("");
      setExternalReference("");
    } catch (e) {
      toast.error("Failed to create funding account");
    }
  };

  const handleCreateRule = async () => {
    try {
      await createRuleMutation.mutateAsync({
        legalEntityId,
        minimumAmount: minAmount || "0",
        maximumAmount: maxAmount || null,
        requiredApprovals: parseInt(reqApprovals) || 1,
        requireDistinctFromCreator: reqDistinct,
      });
      toast.success("Approval rule created successfully");
      setShowAddRule(false);
      setMinAmount("");
      setMaxAmount("");
    } catch (e) {
      toast.error("Failed to create approval rule");
    }
  };

  // Columns for Funding Accounts
  const fundingColumns = useMemo(() => [
    fundingColumnHelper.accessor("name", {
      header: "ACCOUNT NAME",
      cell: (info) => <p className="font-bold text-[#0b100e]">{info.getValue()}</p>,
    }),
    fundingColumnHelper.accessor("accountType", {
      header: "TYPE",
      cell: (info) => <p className="text-[#68726d] font-medium">{info.getValue()}</p>,
    }),
    fundingColumnHelper.accessor("maskedIdentifier", {
      header: "ACCOUNT NUMBER",
      cell: (info) => <p className="text-[#68726d] tracking-wide">***{info.getValue()?.slice(-4)}</p>,
    }),
    fundingColumnHelper.accessor("currency", {
      header: "CURRENCY",
      cell: (info) => <p className="text-[#68726d] font-bold">{info.getValue()}</p>,
    }),
    fundingColumnHelper.accessor("isActive", {
      header: "STATUS",
      cell: (info) => (
        <StatusBadge status={info.getValue() ? "active" : "inactive"} label={info.getValue() ? "Active" : "Inactive"} />
      ),
    }),
    fundingColumnHelper.display({
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

  // Columns for Approval Rules
  const ruleColumns = useMemo(() => [
    approvalRuleColumnHelper.accessor("minimumAmount", {
      header: "MIN AMOUNT",
      cell: (info) => <p className="font-bold text-[#0b100e]">₦{parseFloat(info.getValue() || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>,
    }),
    approvalRuleColumnHelper.accessor("maximumAmount", {
      header: "MAX AMOUNT",
      cell: (info) => <p className="font-bold text-[#0b100e]">{info.getValue() ? `₦${parseFloat(info.getValue() || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "No Limit"}</p>,
    }),
    approvalRuleColumnHelper.accessor("requiredApprovals", {
      header: "REQUIRED APPROVALS",
      cell: (info) => <p className="text-[#68726d] font-medium">{info.getValue()} Approver(s)</p>,
    }),
    approvalRuleColumnHelper.accessor("requireDistinctFromCreator", {
      header: "DISTINCT CREATOR",
      cell: (info) => <p className="text-[#68726d] font-medium">{info.getValue() ? "Yes" : "No"}</p>,
    }),
    approvalRuleColumnHelper.accessor("isActive", {
      header: "STATUS",
      cell: (info) => (
        <StatusBadge status={info.getValue() ? "active" : "inactive"} label={info.getValue() ? "Active" : "Inactive"} />
      ),
    }),
    approvalRuleColumnHelper.display({
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

  const displayFunding = useMemo(() => {
    let data = (fundingData as any)?.data || [];
    if (fundingTableProps.globalSearch) {
      const q = fundingTableProps.globalSearch.toLowerCase();
      data = data.filter((p: FundingAccount) => p.name?.toLowerCase().includes(q));
    }
    return data;
  }, [fundingData, fundingTableProps.globalSearch]);

  const displayRules = useMemo(() => {
    return (rulesData as any)?.data || [];
  }, [rulesData]);

  return (
    <div className="flex flex-col h-full pb-2 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#10231d]">Bill Pay Settings</h1>
          <p className="text-sm text-[#68726d] mt-1">Manage funding accounts and approval rules.</p>
        </div>
      </div>

      <div className="space-y-6 flex-1 flex flex-col min-h-[600px]">
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-[500px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide shrink-0">
              <TabsTrigger 
                value="funding" 
                className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
              >
                Funding Accounts
              </TabsTrigger>
              <TabsTrigger 
                value="rules" 
                className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-4 text-[13px] font-semibold h-full flex items-center"
              >
                Approval Rules
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "funding" && (
              <Button onClick={() => setShowAddFunding(true)} className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-9 px-4 font-semibold text-[13px] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            )}

            {activeTab === "rules" && (
              <Button onClick={() => setShowAddRule(true)} className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-9 px-4 font-semibold text-[13px] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Rule
              </Button>
            )}
          </div>
          
          {/* Funding Tab Content */}
          <TabsContent value="funding" className="flex-1 flex flex-col min-h-0 mt-4 border-none outline-none">
            <div className="flex-1 overflow-hidden">
              <DataTable
                data={displayFunding}
                isLoading={fundingLoading}
                manualPagination={true}
                columns={fundingColumns as any}
                paginationProps={{
                  ...fundingTableProps.paginationProps,
                  total: (fundingData as any)?.meta?.totalCount || displayFunding.length,
                }}
                enableRowSelection={false}
                enableColumnVisibility={false}
                selectedDataIds={fundingTableProps.selectedDataIds}
                setSelectedDataIds={fundingTableProps.setSelectedDataIds}
                tableHeader={{
                  actionButton: <></>,
                  isSearchable: true,
                  isExportable: true,
                  isFilter: false,
                  enableColumnVisibility: false,
                  search: fundingTableProps.globalSearch,
                  searchQuery: fundingTableProps.setGlobalSearch,
                  filterProps: { title: "Filter", filterData: [], onFilter: () => fundingTableProps.setPage(1) },
                  bulkActions: [],
                }}
              />
            </div>
          </TabsContent>

          {/* Rules Tab Content */}
          <TabsContent value="rules" className="flex-1 flex flex-col min-h-0 mt-4 border-none outline-none">
            <div className="flex-1 overflow-hidden">
              <DataTable
                data={displayRules}
                isLoading={rulesLoading}
                manualPagination={true}
                columns={ruleColumns as any}
                paginationProps={{
                  ...ruleTableProps.paginationProps,
                  total: (rulesData as any)?.meta?.totalCount || displayRules.length,
                }}
                enableRowSelection={false}
                enableColumnVisibility={false}
                selectedDataIds={ruleTableProps.selectedDataIds}
                setSelectedDataIds={ruleTableProps.setSelectedDataIds}
                tableHeader={{
                  actionButton: <></>,
                  isSearchable: false,
                  isExportable: false,
                  isFilter: false,
                  enableColumnVisibility: false,
                  filterProps: { title: "Filter", filterData: [], onFilter: () => ruleTableProps.setPage(1) },
                  bulkActions: [],
                }}
              />
            </div>
          </TabsContent>

        </Tabs>
      </div>

      {/* Add Funding Account Modal */}
      <Dialog open={showAddFunding} onOpenChange={setShowAddFunding}>
        <DialogContent className="sm:max-w-[425px] rounded-[16px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#10231d]">Add Funding Account</DialogTitle>
            <DialogDescription className="text-sm text-[#68726d]">Connect a new bank account to fund your bill payments.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input 
                value={fundingName} 
                onChange={(e) => setFundingName(e.target.value)} 
                placeholder="e.g. Main Operating Account"
                className="rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger className="w-full rounded-[8px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input 
                value={maskedIdentifier} 
                onChange={(e) => setMaskedIdentifier(e.target.value)} 
                placeholder="e.g. 1234567890"
                className="rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label>External Reference (Optional)</Label>
              <Input 
                value={externalReference} 
                onChange={(e) => setExternalReference(e.target.value)} 
                placeholder="Bank or internal ref code"
                className="rounded-[8px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFunding(false)} className="rounded-[8px]">Cancel</Button>
            <Button onClick={handleCreateFunding} disabled={createFundingMutation.isPending || !fundingName || !maskedIdentifier} className="bg-[#087f70] text-white hover:bg-[#076b5e] rounded-[8px]">Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Approval Rule Modal */}
      <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
        <DialogContent className="sm:max-w-[425px] rounded-[16px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#10231d]">Add Approval Rule</DialogTitle>
            <DialogDescription className="text-sm text-[#68726d]">Define conditions for payment approvals.</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Minimum Amount (NGN)</Label>
              <Input 
                value={minAmount} 
                onChange={(e) => setMinAmount(e.target.value)} 
                placeholder="0.00"
                type="number"
                className="rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Maximum Amount (NGN) - Optional</Label>
              <Input 
                value={maxAmount} 
                onChange={(e) => setMaxAmount(e.target.value)} 
                placeholder="No limit if left blank"
                type="number"
                className="rounded-[8px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Required Approvals</Label>
              <Input 
                value={reqApprovals} 
                onChange={(e) => setReqApprovals(e.target.value)} 
                type="number"
                min="1"
                className="rounded-[8px]"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="distinct" checked={reqDistinct} onCheckedChange={(c) => setReqDistinct(!!c)} />
              <label
                htmlFor="distinct"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Approver must be distinct from creator
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRule(false)} className="rounded-[8px]">Cancel</Button>
            <Button onClick={handleCreateRule} disabled={createRuleMutation.isPending} className="bg-[#087f70] text-white hover:bg-[#076b5e] rounded-[8px]">Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default withPermissions(BillPaySettingsPage, [
  { resource: "bill_pay.configuration", action: "manage" },
]);
