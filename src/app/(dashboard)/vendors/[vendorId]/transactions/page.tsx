"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAxios } from "@/hooks/useAxios";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import { Search, Download, ChevronDown } from "lucide-react";
import { asRecord, getString, pickString } from "@/lib/types/api-error";

export default function VendorTransactionsPage() {
  const { vendorId } = useParams() as { vendorId: string };
  const _router = useRouter();
  const axiosInstance = useAxios();

  const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchVendor = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`/vendors/${vendorId}`);
      setVendor(asRecord(res.data.data));
    } catch (err) {
      logger.error("Error fetching vendor details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!vendorId) return;
    queueMicrotask(() => {
      void fetchVendor();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  // Mocked data for Transactions
  const mockTransactions = Array.from({ length: 11 }).map((_, i) => ({
    id: `txn-${i}`,
    invoiceNumber: "In-234-53",
    relatedPO: "PO-2024-001",
    amount: "N200,000",
    status: "Successful",
    date: "26-09-2025",
    paidBy: "Seun Dede"
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div>
        <p className="text-muted-foreground">Vendor not found.</p>
      </div>
    );
  }

  const totalPages = 8;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a202c]">{pickString(vendor, "legalName", "displayName")}</h1>
        <p className="text-sm text-gray-500 mt-1">{getString(vendor.email)}</p>
      </div>

      {/* ── Transactions Card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Top Controls */}
        <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">All Transactions</h2>

          <div className="flex items-center gap-3">
            <div className="relative w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#00BFA5] transition-colors"
              />
            </div>
            <button className="h-10 px-4 rounded-xl border border-[#00BFA5] text-[#00BFA5] text-sm font-semibold hover:bg-[#00BFA5]/5 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-100">
                <th className="px-6 py-3.5 font-semibold text-xs text-gray-500 uppercase tracking-wide">Invoice Number</th>
                <th className="px-6 py-3.5 font-semibold text-xs text-gray-500 uppercase tracking-wide">Related PO</th>
                <th className="px-6 py-3.5 font-semibold text-xs text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="px-6 py-3.5 font-semibold text-xs text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3.5 font-semibold text-xs text-gray-500 uppercase tracking-wide">Submission Date</th>
                <th className="px-6 py-3.5 font-semibold text-xs text-gray-500 uppercase tracking-wide">Paid By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">{txn.invoiceNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{txn.relatedPO}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{txn.amount}</td>
                  <td className="px-6 py-4 text-sm font-medium text-emerald-500">{txn.status}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{txn.date}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{txn.paidBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <span>Showing 1-11 of 170 entries</span>
            <button className="h-9 px-3 rounded-lg border border-gray-200 flex items-center gap-2 hover:bg-gray-50 font-medium text-gray-700">
              4 <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 h-9 rounded-lg hover:bg-gray-50 text-gray-500 font-medium transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium transition-colors ${
                  currentPage === page
                    ? "bg-[#00BFA5] text-white"
                    : "hover:bg-gray-50 text-gray-600"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 h-9 rounded-lg hover:bg-gray-50 text-gray-500 font-medium transition-colors"
            >
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}