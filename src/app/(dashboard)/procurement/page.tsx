"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building, Plus, Package, Truck, Clock,
  AlertTriangle, ArrowRight, ShoppingCart, FileCheck,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";
import { useGetPurchaseRequests } from "@/queries/procurement/purchase-requests";
import { usePurchaseOrders } from "@/queries/procurement/purchase-orders";
import {
  canPOApprove,
  canPOCreate,
  canPOReadCompany,
  canPOReadDepartment,
} from "@/lib/permissions/purchase-order-permissions";

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon,
  isLoading,
  onClick,
  highlight,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
  onClick?: () => void;
  highlight?: boolean;
}) {
  return (
    <Card
      onClick={onClick}
      className={`bg-dashboard-card border-dashboard-border transition-all ${
        onClick ? "cursor-pointer hover:border-primary/40 hover:shadow-md" : ""
      } ${highlight ? "ring-1 ring-red-400/40 border-red-200" : ""}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-1">
            <p className="text-dashboard-text-secondary text-sm">{title}</p>
            {isLoading ? (
              <div className="h-8 w-16 bg-muted/60 animate-pulse rounded-md" />
            ) : (
              <p className={`text-2xl font-bold ${highlight && Number(value) > 0 ? "text-red-500" : "text-dashboard-text-primary"}`}>
                {value}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {onClick && !isLoading && Number(value) > 0 && (
              <p className="text-xs text-primary flex items-center gap-1 mt-1 font-medium">
                Review now <ArrowRight className="w-3 h-3" />
              </p>
            )}
          </div>
          <div className="ml-4 shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Quick Action Button ───────────────────────────────────────────────────────

function QuickActionBtn({
  icon, label, onClick,
}: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 h-20 w-full rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
    >
      <span className="text-muted-foreground group-hover:text-primary transition-colors">{icon}</span>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">{label}</span>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Procurement() {
  const router = useRouter();
  const can    = useAuthStore(s => s.can);

  // Permission flags
  const hasTeamScope  = can("procurement.purchase_request", "read_department");
  const canApprove    = can("procurement.purchase_request", "approve");
  const canConvert    = can("procurement.purchase_request", "convert_to_po");
  const canApprovePO  = canPOApprove(can);
  const canCreatePR   = can("procurement.purchase_request", "create");
  const canCreatePO   = canPOCreate(can);
  const poScope = canPOReadCompany(can) ? "company" : canPOReadDepartment(can) ? "team" : "own";
  const canViewVendors = can("vendor", "read") || can("vendor", "manage");

  // ── Live count queries (meta.totalCount only) ─────────────────────────────

  const scope = hasTeamScope ? "team" : "own";

  const { data: prApprovalCount, isLoading: loadingPRApproval } = useGetPurchaseRequests(
    { scope, status: "submitted", requiresMyApproval: true },
    { enabled: canApprove, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const needsMyApprovalPR = (prApprovalCount as unknown as number) ?? 0;

  const { data: prConvertCount, isLoading: loadingPRConvert } = useGetPurchaseRequests(
    { scope, status: "approved", requiresMyConversion: true },
    { enabled: canConvert, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const readyForPO = (prConvertCount as unknown as number) ?? 0;

  const { data: poApprovalCount, isLoading: loadingPOApproval } = usePurchaseOrders(
    1, 1, "pending_approval", undefined, undefined, poScope,
    { enabled: canApprovePO && (canPOReadCompany(can) || canPOReadDepartment(can)), select: (d) => d.meta?.totalCount ?? 0 }
  );
  const needsMyApprovalPO = (poApprovalCount as unknown as number) ?? 0;

  const totalNeedsAction = needsMyApprovalPR + needsMyApprovalPO + readyForPO;
  const isLoadingCounts  = loadingPRApproval || loadingPRConvert || loadingPOApproval;

  // ── General overview counts ───────────────────────────────────────────────

  const { data: allPRData, isLoading: loadingAllPR } = useGetPurchaseRequests({ scope });
  const totalPRs = allPRData?.meta?.totalCount ?? allPRData?.data?.length ?? 0;

  const { data: allPOData, isLoading: loadingAllPO } = usePurchaseOrders(1, 1, undefined, undefined, undefined, scope);
  const totalPOs = allPOData?.meta?.totalCount ?? 0;

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-dashboard-text-primary">Procurement</h1>
            <p className="text-dashboard-text-secondary mt-1">Manage purchase requests and purchase orders</p>
          </div>
          <div className="flex gap-3">
            {canViewVendors && (
              <Button variant="outline" onClick={() => router.push("/vendors")}>
                <Building className="w-4 h-4 mr-2" /> Vendor Directory
              </Button>
            )}
            {canCreatePR && (
              <Button
                className="bg-dashboard-accent hover:bg-dashboard-accent/90"
                onClick={() => router.push("/procurement/purchase-request/new")}
              >
                <Plus className="w-4 h-4 mr-2" /> New Request
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Needs Your Action"
            value={totalNeedsAction}
            subtitle={totalNeedsAction > 0 ? "Items waiting on you" : "You're all caught up"}
            isLoading={isLoadingCounts}
            highlight={totalNeedsAction > 0}
            onClick={
              totalNeedsAction > 0
                ? () => router.push(
                    canApprove
                      ? "/procurement/purchase-request?outerTab=team&innerTab=awaiting_approval"
                      : "/procurement/purchase-order?outerTab=team"
                  )
                : undefined
            }
            icon={
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                totalNeedsAction > 0 ? "bg-red-50" : "bg-muted/40"
              }`}>
                <AlertTriangle className={`w-6 h-6 ${totalNeedsAction > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </div>
            }
          />

          <StatCard
            title="Ready for PO"
            value={readyForPO}
            subtitle="Approved PRs awaiting conversion"
            isLoading={loadingPRConvert}
            onClick={
              canConvert && readyForPO > 0
                ? () => router.push("/procurement/purchase-request?outerTab=team&innerTab=ready_for_po")
                : undefined
            }
            icon={
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-violet-500" />
              </div>
            }
          />

          <StatCard
            title="Purchase Requests"
            value={totalPRs}
            subtitle="Total in your scope"
            isLoading={loadingAllPR}
            onClick={() => router.push("/procurement/purchase-request")}
            icon={
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
            }
          />

          <StatCard
            title="Purchase Orders"
            value={totalPOs}
            subtitle="Total in your scope"
            isLoading={loadingAllPO}
            onClick={() => router.push("/procurement/purchase-order")}
            icon={
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-emerald-500" />
              </div>
            }
          />
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick access */}
          <Card className="bg-dashboard-card border-dashboard-border">
            <CardContent className="p-6">
              <h3 className="text-base font-semibold text-dashboard-text-primary mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {canCreatePR && (
                  <QuickActionBtn
                    icon={<Plus className="w-5 h-5" />}
                    label="New PR"
                    onClick={() => router.push("/procurement/purchase-request/new")}
                  />
                )}
                <QuickActionBtn
                  icon={<Package className="w-5 h-5" />}
                  label="View Requests"
                  onClick={() => router.push("/procurement/purchase-request")}
                />
                <QuickActionBtn
                  icon={<Truck className="w-5 h-5" />}
                  label="View Orders"
                  onClick={() => router.push("/procurement/purchase-order")}
                />
                {canViewVendors && (
                  <QuickActionBtn
                    icon={<Building className="w-5 h-5" />}
                    label="Vendors"
                    onClick={() => router.push("/vendors")}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Summary */}
          <Card className="bg-dashboard-card border-dashboard-border">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-base font-semibold text-dashboard-text-primary">Action Summary</h3>
              {isLoadingCounts ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-muted/60 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {canApprove && (
                    <button
                      onClick={() => router.push("/procurement/purchase-request?outerTab=team&innerTab=awaiting_approval")}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground">PRs awaiting your approval</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {needsMyApprovalPR > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                            {needsMyApprovalPR}
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  )}
                  {canConvert && (
                    <button
                      onClick={() => router.push("/procurement/purchase-request?outerTab=team&innerTab=ready_for_po")}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <FileCheck className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground">PRs ready for PO conversion</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {readyForPO > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-violet-500 text-white text-[10px] font-bold">
                            {readyForPO}
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  )}
                  {canApprovePO && (
                    <button
                      onClick={() => router.push("/procurement/purchase-order?outerTab=team")}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground">POs awaiting your approval</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {needsMyApprovalPO > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                            {needsMyApprovalPO}
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  )}
                  {!canApprove && !canConvert && !canApprovePO && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No actions pending — you're all caught up.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}