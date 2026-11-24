"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Eye,
  FileCheck2,
  Filter,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/custom-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-stores";
import {
  useEntityWorkspaceStore,
  workspaceReadOnly,
} from "@/features/entity-workspace/store";
import {
  PoChangeRequestSummary,
  usePoChangeRequests,
  usePoChangeSettings,
  useUpdatePoChangeSettings,
} from "@/queries/procurement/po-change-requests";
import { PoChangeRequestDrawer } from "@/components/procurement/PoChangeRequestDrawer";
import { formatCurrency } from "@/lib/utils/currency";

type QueueTab = "needs_review" | "awaiting_vendor" | "resolved" | "all";

interface PoChangeRequestsProps {
  purchaseOrderId?: string;
}

export function PoChangeRequests({ purchaseOrderId }: PoChangeRequestsProps) {
  const can = useAuthStore((state) => state.canPermission);
  const authorization = useAuthStore((state) => state.authorization);
  const readonly = workspaceReadOnly();

  const canRead =
    Boolean(authorization) &&
    ["read_company", "approval_decision", "issue"].some((action) =>
      can(`procurement.purchase_order.${action}`)
    );

  const canManageSettings = can("procurement_spend_program.manage");

  // State
  const [activeTab, setActiveTab] = useState<QueueTab>("needs_review");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Settings dialog
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [validityDaysInput, setValidityDaysInput] = useState<number | "">("");

  // Queries
  const { data: settingsData } = usePoChangeSettings({
    enabled: canRead && !purchaseOrderId,
  });

  const updateSettingsMutation = useUpdatePoChangeSettings();

  // Determine query status parameter based on tab & dropdown
  const queryStatusParam = useMemo(() => {
    if (statusFilter !== "all") {
      return statusFilter;
    }
    if (activeTab === "needs_review") {
      return undefined; // Filter client-side or fetch all
    }
    if (activeTab === "awaiting_vendor") {
      return "returned_for_correction";
    }
    return undefined;
  }, [activeTab, statusFilter]);

  const {
    data: responseData,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = usePoChangeRequests(
    {
      page,
      limit: perPage,
      status: queryStatusParam,
      purchaseOrderId,
    },
    { enabled: canRead }
  );

  const { data: needsReviewData } = usePoChangeRequests(
    { status: "pending_review", limit: 1 },
    { enabled: canRead, staleTime: 30_000 }
  );
  const needsReviewCount = needsReviewData?.meta?.totalCount ?? 0;

  const allItems = responseData?.data || [];

  // Filter items based on activeTab and searchQuery
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Tab filter
      if (statusFilter === "all") {
        if (activeTab === "needs_review") {
          if (!["pending_review", "approved_pending_issue"].includes(item.status)) {
            return false;
          }
        } else if (activeTab === "awaiting_vendor") {
          if (item.status !== "returned_for_correction") {
            return false;
          }
        } else if (activeTab === "resolved") {
          if (
            ["pending_review", "approved_pending_issue", "returned_for_correction"].includes(
              item.status
            )
          ) {
            return false;
          }
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const poMatch = item.poNumber?.toLowerCase().includes(q);
        const vendorMatch =
          item.vendorName?.toLowerCase().includes(q) ||
          item.vendorLegalName?.toLowerCase().includes(q);
        if (!poMatch && !vendorMatch) return false;
      }

      return true;
    });
  }, [allItems, activeTab, statusFilter, searchQuery]);

  if (!canRead) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-border">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-[#0b100e]">Access Restricted</h3>
        <p className="text-sm text-[#68726d] mt-1">
          You do not have permission to view purchase order price change requests.
        </p>
      </div>
    );
  }

  const handleOpenSettings = () => {
    if (settingsData?.validityDays) {
      setValidityDaysInput(settingsData.validityDays);
    }
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    const days = Number(validityDaysInput);
    if (!days || days < 1 || days > 365) return;
    updateSettingsMutation.mutate(days, {
      onSuccess: () => setIsSettingsOpen(false),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0b100e]">
            PO Price Change Requests
          </h1>
          <p className="text-sm text-[#68726d] mt-0.5">
            Review vendor price proposals. Approvals issue revised purchase orders with updated pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!purchaseOrderId && settingsData && canManageSettings && (
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenSettings}
                  className="gap-1.5 text-xs text-[#374151] rounded-lg h-8 px-3 border border-black/[0.12]"
                >
                  <Settings2 className="w-3.5 h-3.5 text-[#68726d]" />
                  <span>Validity: {settingsData.validityDays} Days</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold text-[#0b100e]">
                    Price Change Proposal Validity
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#68726d]">
                    Sets the calendar days a vendor price proposal remains valid from submission or corrected resubmission.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2">
                  <label className="text-xs font-medium text-[#374151]">
                    Validity Period (Calendar Days)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={validityDaysInput}
                    onChange={(e) =>
                      setValidityDaysInput(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="14"
                    className="text-sm"
                  />
                  <p className="text-[11px] text-[#68726d]">
                    Applies to new submissions and vendor corrections.
                  </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSettingsOpen(false)}
                    className="rounded-lg h-8 px-3 text-xs border border-black/[0.12]"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={
                      readonly ||
                      updateSettingsMutation.isPending ||
                      !validityDaysInput ||
                      Number(validityDaysInput) < 1
                    }
                    onClick={handleSaveSettings}
                    className="rounded-lg h-8 px-3.5 text-xs bg-[#087f70] hover:bg-[#076c5f] text-white disabled:opacity-40"
                  >
                    {updateSettingsMutation.isPending && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    )}
                    Save Setting
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
            className="gap-1.5 text-xs text-[#374151] rounded-lg h-8 px-3 border border-black/[0.12]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#68726d] ${
                isRefetching ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Readonly alert */}
      {readonly && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Workspace is in a multi-entity or read-only view. Select a specific active legal entity to approve, reject, or return price changes.
          </span>
        </div>
      )}

      {/* Filters and Tabs Bar */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#f5f7f6] rounded-xl self-start">
            <button
              onClick={() => {
                setActiveTab("needs_review");
                setStatusFilter("all");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "needs_review"
                  ? "bg-white text-[#087f70] shadow-xs"
                  : "text-[#68726d] hover:text-[#0b100e]"
              }`}
            >
              <span>Needs Review</span>
              {needsReviewCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-[#ff7b6b] text-white leading-none shadow-[0_2px_8px_rgba(255,123,107,0.25)]">
                  {needsReviewCount > 99 ? "99+" : needsReviewCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("awaiting_vendor");
                setStatusFilter("all");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "awaiting_vendor"
                  ? "bg-white text-[#087f70] shadow-xs"
                  : "text-[#68726d] hover:text-[#0b100e]"
              }`}
            >
              Awaiting Vendor
            </button>
            <button
              onClick={() => {
                setActiveTab("resolved");
                setStatusFilter("all");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "resolved"
                  ? "bg-white text-[#087f70] shadow-xs"
                  : "text-[#68726d] hover:text-[#0b100e]"
              }`}
            >
              Resolved
            </button>
            <button
              onClick={() => {
                setActiveTab("all");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-white text-[#087f70] shadow-xs"
                  : "text-[#68726d] hover:text-[#0b100e]"
              }`}
            >
              All Requests
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#68726d]" />
              <Input
                placeholder="Search PO or Vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-white"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger size="sm" className="h-9 min-w-[130px] text-xs bg-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="approved_pending_issue">Awaiting Final Issue</SelectItem>
                <SelectItem value="returned_for_correction">Returned for Correction</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-[#f9faf9] text-[#68726d]">
                <th className="px-5 py-3 font-semibold">Purchase Order & Vendor</th>
                <th className="px-4 py-3 font-semibold">Revision / Version</th>
                <th className="px-4 py-3 font-semibold text-right">Proposed Difference</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Valid Until</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#68726d]">
                    <Loader2 className="w-6 h-6 animate-spin text-[#087f70] mx-auto mb-2" />
                    <span>Loading price change proposals...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      icon={<FileCheck2 className="w-6 h-6 text-[#68726d]" />}
                      title="No price change requests found"
                      description={
                        searchQuery.trim()
                          ? "No proposals match your search query."
                          : activeTab === "needs_review"
                          ? "There are no pending price revisions requiring buyer review."
                          : activeTab === "awaiting_vendor"
                          ? "No proposals are currently awaiting vendor correction."
                          : "No price change requests in this view."
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => {
                  const diffVal = Number(row.difference || 0);
                  const isIncrease = diffVal > 0;
                  const isDecrease = diffVal < 0;
                  const isActionable = [
                    "pending_review",
                    "approved_pending_issue",
                  ].includes(row.status);

                  return (
                    <tr
                      key={row.priceChangeRequestId}
                      onClick={() => setSelectedRequestId(row.priceChangeRequestId)}
                      className="hover:bg-black/[0.015] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/procurement/purchase-order/${row.purchaseOrderId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-[#087f70] hover:underline"
                        >
                          {row.poNumber}
                        </Link>
                        <p className="text-xs text-[#374151] font-medium mt-0.5">
                          {row.vendorName || row.vendorLegalName || "Vendor"}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-[#374151]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#0b100e]">
                            Version {row.version}
                          </span>
                          {row.version > 1 ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
                              Amendment
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#f3f4f6] text-[#6b7280]">
                              Initial
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-medium">
                        <span
                          className={`font-semibold ${
                            isIncrease
                              ? "text-amber-800"
                              : isDecrease
                              ? "text-emerald-700"
                              : "text-[#0b100e]"
                          }`}
                        >
                          {isIncrease ? "+" : ""}
                          {formatCurrency(row.difference, row.currency)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>

                      <td className="px-4 py-3.5 text-[#68726d]">
                        {row.expiresAt ? (
                          format(new Date(row.expiresAt), "MMM dd, yyyy")
                        ) : (
                          "—"
                        )}
                      </td>

                      <td
                        className="px-5 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedRequestId(row.priceChangeRequestId)}
                          className={
                            isActionable
                              ? "h-8 px-3 rounded-lg bg-[#087f70] hover:bg-[#076c5f] text-white text-xs font-semibold transition-colors shadow-xs"
                              : "h-8 px-3 rounded-lg border border-black/[0.12] bg-white hover:bg-black/[0.03] text-[#374151] text-xs font-semibold transition-colors"
                          }
                        >
                          {isActionable ? "Review" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {responseData?.meta && responseData.meta.totalCount > 0 && (
          <Pagination
            total={responseData.meta.totalCount}
            page={page}
            perPage={perPage}
            totalPages={responseData.meta.totalPages}
            onPage={setPage}
            onPerPage={setPerPage}
          />
        )}
      </div>

      {/* Review & Audit Modal */}
      <PoChangeRequestDrawer
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        vendorName={
          allItems.find((r) => r.priceChangeRequestId === selectedRequestId)?.vendorName ||
          allItems.find((r) => r.priceChangeRequestId === selectedRequestId)?.vendorLegalName
        }
      />
    </div>
  );
}
