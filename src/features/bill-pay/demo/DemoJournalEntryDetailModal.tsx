"use client";

import { toast } from "sonner";
import {
  BookOpenCheck,
  CheckCircle2,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { type DemoJournalEntry } from "./demo-data";
import { formatNgn, mapDemoBadgeStatus } from "./demo-utils";

interface JournalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journal: DemoJournalEntry | null;
}

export function DemoJournalEntryDetailModal({
  open,
  onOpenChange,
  journal,
}: JournalModalProps) {
  if (!journal) return null;

  const badge = mapDemoBadgeStatus(journal.status);
  const totalDebits = journal.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredits = journal.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = totalDebits === totalCredits && totalDebits > 0;

  function handleExport() {
    toast.success(`Journal Voucher JV-${journal!.id.toUpperCase()} exported to PDF.`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-2xl p-6">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#f0faf8] flex items-center justify-center text-[#087f70]">
              <BookOpenCheck className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#10231d]">
                General Ledger Journal Voucher Detail
              </DialogTitle>
              <DialogDescription className="text-xs text-[#68726d]">
                Double-entry financial journal entry posted to your General Ledger.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Header Card */}
          <div className="p-4 rounded-xl bg-gray-50 border border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#10231d] text-sm">
                  JV-{journal.id.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700 text-[10px] font-bold uppercase">
                  {journal.stage}
                </span>
              </div>
              <p className="text-xs text-[#10231d] font-semibold mt-1">{journal.memo}</p>
              <p className="text-[11px] text-[#68726d] mt-0.5">Source Doc: {journal.sourceRef}</p>
            </div>

            <div className="text-right">
              <StatusBadge status={badge.status} label={badge.label} />
              <p className="text-[11px] text-[#68726d] mt-1">{journal.date}</p>
            </div>
          </div>

          {/* Double-Entry Ledger Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#68726d]">
                Double-Entry Accounting Distribution
              </h4>
              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {isBalanced ? "Balanced (Debits = Credits)" : "Unbalanced"}
              </span>
            </div>

            <div className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#f9faf9] border-b border-black/[0.06] text-left text-[11px] font-bold text-[#68726d]">
                    <th className="px-3.5 py-2.5">General Ledger Account</th>
                    <th className="px-3.5 py-2.5 text-right">Debit (DR)</th>
                    <th className="px-3.5 py-2.5 text-right">Credit (CR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {journal.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-3.5 py-3 font-sans">
                        <p className="font-semibold text-[#10231d]">{line.account}</p>
                        <p className="text-[11px] text-[#68726d]">Department: Administration</p>
                      </td>
                      <td className="px-3.5 py-3 text-right font-bold text-[#10231d]">
                        {line.debit > 0 ? formatNgn(line.debit) : "—"}
                      </td>
                      <td className="px-3.5 py-3 text-right font-bold text-[#10231d]">
                        {line.credit > 0 ? formatNgn(line.credit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#fbfcfb] border-t border-black/[0.08] font-mono font-bold text-xs">
                    <td className="px-3.5 py-2.5 font-sans text-gray-700">Total Journal Postings</td>
                    <td className="px-3.5 py-2.5 text-right text-[#087f70]">{formatNgn(totalDebits)}</td>
                    <td className="px-3.5 py-2.5 text-right text-[#087f70]">{formatNgn(totalCredits)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ERP Integration Metadata */}
          <div className="p-3 rounded-xl bg-gray-50 border border-black/[0.06] flex items-center justify-between text-[11px] text-[#68726d]">
            <div>
              <span>ERP Sync Protocol: </span>
              <strong className="text-[#10231d]">NetSuite / SAP Ready</strong>
            </div>
            <div>
              <span>Fiscal Period: </span>
              <strong className="text-[#10231d]">2026-Q4 (Open)</strong>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs rounded-xl gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export Voucher PDF
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
