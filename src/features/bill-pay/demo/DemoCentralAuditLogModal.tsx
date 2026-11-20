"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  History,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Receipt,
  CreditCard,
  Building2,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBillPayDemoStore } from "./useBillPayDemoStore";
import type { DemoAuditEntry } from "./demo-data";

interface DemoCentralAuditLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EntityFilter = "ALL" | "BILL" | "PAYMENT" | "CARD" | "VENDOR" | "RECURRING";

export function DemoCentralAuditLogModal({
  open,
  onOpenChange,
}: DemoCentralAuditLogModalProps) {
  const { auditLogs = [] } = useBillPayDemoStore();
  const [filterType, setFilterType] = useState<EntityFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<DemoAuditEntry | null>(null);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesType = filterType === "ALL" || log.entityType === filterType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.actor.toLowerCase().includes(q) ||
        log.actorRole.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entityReference.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [auditLogs, filterType, searchQuery]);

  function handleExportCsv() {
    toast.success("Audit Trail Exported", {
      description: `Downloaded ${filteredLogs.length} immutable compliance audit records as CSV.`,
    });
  }

  function getEntityIcon(type: DemoAuditEntry["entityType"]) {
    switch (type) {
      case "BILL":
        return <Receipt className="w-3.5 h-3.5 text-[#087f70]" />;
      case "PAYMENT":
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />;
      case "CARD":
        return <CreditCard className="w-3.5 h-3.5 text-purple-600" />;
      case "VENDOR":
        return <Building2 className="w-3.5 h-3.5 text-amber-600" />;
      case "RECURRING":
        return <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />;
    }
  }

  function getStatusBadge(status: DemoAuditEntry["status"]) {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5" /> Success
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-2.5 h-2.5" /> Warning / Gate
          </span>
        );
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-2.5 h-2.5" /> Blocked / Failed
          </span>
        );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-2xl p-6 max-h-[88vh] flex flex-col">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-black/[0.06]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#f0faf8] border border-[#c8ece4] flex items-center justify-center text-[#087f70]">
                <History className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#10231d]">
                  Central Audit &amp; Compliance Trail
                </DialogTitle>
                <DialogDescription className="text-xs text-[#68726d]">
                  Chronological, non-repudiable log of all approvals, dual-control releases, and spend actions.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="rounded-xl text-xs font-semibold h-8 gap-1.5 border-black/[0.08]"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" /> Export CSV
            </Button>
          </div>
        </DialogHeader>

        {/* Filter Controls & Search */}
        <div className="pt-3 pb-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { key: "ALL", label: "All Events" },
                  { key: "BILL", label: "Bills & AP" },
                  { key: "PAYMENT", label: "Payments" },
                  { key: "CARD", label: "Cards & Expenses" },
                  { key: "VENDOR", label: "Vendors & Banks" },
                  { key: "RECURRING", label: "Recurring" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterType(tab.key)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filterType === tab.key
                      ? "bg-[#087f70] text-white shadow-2xs font-semibold"
                      : "bg-gray-100/80 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                  {tab.key === "ALL" && (
                    <span className="ml-1.5 text-[10px] opacity-80 font-bold">
                      {auditLogs.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search actor, reference, action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs rounded-xl border-black/[0.08]"
              />
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto border border-black/[0.06] rounded-xl bg-white min-h-[300px]">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#68726d] space-y-2">
              <History className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="font-semibold text-gray-700">No audit events match your filter</p>
              <p className="text-[11px] text-gray-500">
                Perform bill approvals, payment runs, or card actions to populate the compliance log.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-[11px] font-semibold text-[#68726d] border-b border-black/[0.06] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor &amp; Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity Reference</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {filteredLogs.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 text-[11px] text-[#68726d] whitespace-nowrap font-mono">
                      {entry.timestamp}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <p className="font-semibold text-[#10231d]">{entry.actor}</p>
                      <p className="text-[10px] text-[#68726d]">{entry.actorRole}</p>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-800">
                        {getEntityIcon(entry.entityType)}
                        {entry.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#10231d] whitespace-nowrap">
                      {entry.entityReference}
                    </td>
                    <td className="py-2.5 px-3 text-[#68726d] max-w-xs truncate" title={entry.details}>
                      {entry.details}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {getStatusBadge(entry.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected Log Detail Peek */}
        {selectedEntry && (
          <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-black/[0.06] text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#10231d] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#087f70]" />
                Event Detail &middot; {selectedEntry.entityReference}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-[10px] text-gray-400 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <p className="text-[#68726d] text-[11px] leading-relaxed">
              {selectedEntry.details}
            </p>
            <div className="flex items-center gap-3 pt-1 text-[10px] text-[#68726d]">
              <span>Actor: <strong>{selectedEntry.actor}</strong> ({selectedEntry.actorRole})</span>
              <span>&bull;</span>
              <span>Timestamp: <strong>{selectedEntry.timestamp}</strong></span>
              <span>&bull;</span>
              <span>Event ID: <code>{selectedEntry.id}</code></span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
