"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const MOCK_RECURRING: Record<string, { vendor: string, amount: string, freq: string }> = {
  "00041": { vendor: "Atlas Partners", amount: "₦4,200,000", freq: "Weekly" },
  "00042": { vendor: "Atlas Partners", amount: "₦4,200,000", freq: "Weekly" },
  "00043": { vendor: "Atlas Partners", amount: "₦4,200,000", freq: "Weekly" },
  "00044": { vendor: "Atlas Partners", amount: "₦4,200,000", freq: "Weekly" },
  "00045": { vendor: "Atlas Partners", amount: "₦4,200,000", freq: "Weekly" },
};

export default function RecurringBillDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  const [viewRole, setViewRole] = useState<"creator" | "approver">("creator");
  const [billStatus, setBillStatus] = useState<"pending" | "active">("pending");

  useEffect(() => {
    setBackHandler(() => router.back());
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router]);

  const billData = MOCK_RECURRING[id] || { vendor: "Acme Ltd", amount: "₦300,000", freq: "Monthly" };

  return (
    <div className="flex-1 pb-8 flex flex-col">
      {/* Demo Controls - ONLY FOR TESTING THE 3 VIEWS */}
      <div className="hidden bg-[#f0faf8] border-b border-[#087f70]/20 p-3 flex justify-end gap-4 text-[13px] sticky top-0 z-50">
        <div className="flex items-center gap-2">
           <span className="text-[#087f70] font-semibold">Demo Role:</span>
           <select className="bg-white border border-[#087f70]/30 rounded-[6px] px-2 py-1 text-[#10231d] outline-none shadow-sm" value={viewRole} onChange={(e) => setViewRole(e.target.value as "creator" | "approver")}>
              <option value="creator">Creator</option>
              <option value="approver">Approver</option>
           </select>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[#087f70] font-semibold">Demo Status:</span>
           <select className="bg-white border border-[#087f70]/30 rounded-[6px] px-2 py-1 text-[#10231d] outline-none shadow-sm" value={billStatus} onChange={(e) => setBillStatus(e.target.value as "pending" | "active")}>
              <option value="pending">Pending</option>
              <option value="active">Active (After Payments)</option>
           </select>
        </div>
      </div>

      {/* Header Section (Sticky) */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-10 bg-[#f4f7f5] pb-4 mb-8 px-6 lg:px-8 pt-5 sm:pt-7 lg:pt-8 -mt-3 sm:-mt-5 lg:-mt-6">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[24px] font-bold text-[#10231d]">{billData.vendor}</h1>
              {billStatus === "pending" ? (
                 <Badge variant="outline" className="bg-[#fffbeb] text-[#d97706] border-[#fcd34d] text-[12px] font-medium h-6 px-2.5 rounded-full">
                    Pending
                 </Badge>
              ) : (
                 <Badge variant="outline" className="bg-[#f0faf8] text-[#087f70] border-[#087f70]/30 text-[12px] font-medium h-6 px-2.5 rounded-full">
                    Active
                 </Badge>
              )}
            </div>
            <p className="text-[13px] text-[#68726d]">Cloud Services • REC-{id || "0089"}</p>
          </div>
          
          <div className="flex items-center gap-3">
             {billStatus === "pending" && viewRole === "creator" && (
                <>
                   <Button variant="outline" className="text-[#087f70] border-[#087f70]/30 hover:bg-[#f0faf8] hover:text-[#076b5e] h-10 rounded-[8px] font-semibold text-[13px] px-5">
                      <Pencil className="w-4 h-4 mr-2" /> Edit Bill
                   </Button>
                   <Button className="bg-[#d33d44] hover:bg-[#b9353c] text-white h-10 rounded-[8px] font-semibold text-[13px] px-5">
                      <XCircle className="w-4 h-4 mr-2" /> Withdraw Bill
                   </Button>
                </>
             )}
             {billStatus === "pending" && viewRole === "approver" && (
                <>
                   <Button variant="outline" className="text-[#d33d44] border-red-200 hover:bg-red-50 hover:text-red-700 h-10 rounded-[8px] font-semibold text-[13px] px-6">
                      Reject Bill
                   </Button>
                   <Button className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-6">
                      Approve Bill
                   </Button>
                </>
             )}
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 max-w-[1200px] mx-auto w-full">
        {/* Layout Grid */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
           
           {/* Main Content (Left) */}
           <div className="flex-1 space-y-6 min-w-0 w-full">
              
              {/* Schedule Information */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <CardContent className="p-6">
                    <div className="mb-6">
                       <span className="text-[28px] font-bold text-[#087f70]">{billData.amount}</span>
                       <span className="text-[14px] text-[#68726d] font-medium ml-1">/ {billData.freq.toLowerCase()}</span>
                    </div>
                    
                    <h3 className="text-[15px] font-bold text-[#10231d] mb-4">Schedule Information</h3>
                    
                    <div className="grid grid-cols-3 gap-4 border-t border-black/[0.04] pt-4">
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">Frequency</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Monthly</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">Start Date</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Jan 1, 2025</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">End Date</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Never</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Payment Configuration */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <CardContent className="p-6">
                    <h3 className="text-[15px] font-bold text-[#10231d] mb-4">Payment Configuration</h3>
                    
                    <div className="grid grid-cols-3 gap-6 mb-6 border-t border-black/[0.04] pt-4">
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">Payment Method</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Card</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">Amount Type</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Variable</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">Amount Tolerance</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">±10%</p>
                       </div>
                    </div>
                    
                    <div>
                       <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">Authorization</p>
                       <p className="text-[13px] font-semibold text-[#10231d]">Auto-approval</p>
                    </div>
                 </CardContent>
              </Card>

              {/* Payment History (Only when Active) */}
              {billStatus === "active" && (
                <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6 pb-4 border-b border-black/[0.06]">
                      <h3 className="text-[15px] font-bold text-[#10231d]">Payment History</h3>
                    </div>
                    <Table>
                      <TableHeader className="bg-[#f9faf9]">
                        <TableRow className="border-black/[0.08] hover:bg-transparent">
                          <TableHead className="h-10 text-[11px] font-semibold text-[#84908a] uppercase tracking-wider pl-6">Date</TableHead>
                          <TableHead className="h-10 text-[11px] font-semibold text-[#84908a] uppercase tracking-wider">Reference</TableHead>
                          <TableHead className="h-10 text-[11px] font-semibold text-[#84908a] uppercase tracking-wider">Amount</TableHead>
                          <TableHead className="h-10 text-[11px] font-semibold text-[#84908a] uppercase tracking-wider">Status</TableHead>
                          <TableHead className="h-10 text-[11px] font-semibold text-[#84908a] uppercase tracking-wider pr-6">Reconciliation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { date: "Aug 1, 2025", ref: "TXN-883014", amount: "₦2,450,000" },
                          { date: "Jul 1, 2025", ref: "TXN-874291", amount: "₦2,450,000" },
                          { date: "Jun 1, 2025", ref: "TXN-865104", amount: "₦2,450,000" },
                          { date: "May 1, 2025", ref: "TXN-854291", amount: "₦2,450,000" }
                        ].map((row, i) => (
                           <TableRow key={i} className="border-black/[0.04] hover:bg-[#f9faf9]/50 transition-colors">
                             <TableCell className="text-[13px] text-[#10231d] font-medium pl-6 py-4">{row.date}</TableCell>
                             <TableCell className="text-[13px] text-[#68726d] py-4">{row.ref}</TableCell>
                             <TableCell className="text-[13px] font-bold text-[#10231d] py-4">{row.amount}</TableCell>
                             <TableCell className="py-4">
                                <Badge variant="outline" className="bg-[#f0faf8] text-[#087f70] border-[#087f70]/30 font-semibold text-[11px] h-6">Paid</Badge>
                             </TableCell>
                             <TableCell className="py-4 pr-6">
                                <span className="text-[12px] font-semibold text-[#087f70] bg-[#f0faf8] border border-[#087f70]/10 px-2 py-1 rounded-[4px]">Reconciled</span>
                             </TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
           </div>

           {/* Sidebar (Right) */}
           <div className="w-full lg:w-[320px] shrink-0 space-y-6">
             
             {billStatus === "pending" && (
                <div className="bg-white rounded-[14px] border border-black/[0.06] shadow-sm overflow-hidden">
                   <div className="bg-[#1C2B36] rounded-t-[14px] px-6 py-4">
                      <h3 className="text-base font-bold text-white">Workflow Progress</h3>
                   </div>
                   <div className="p-6">
                      <div className="relative border-l-[2px] border-black/[0.06] ml-3.5 space-y-7 pb-2 mt-2">
                         
                         {/* Step 1 */}
                         <div className="relative pl-7">
                            <div className="absolute -left-[11px] -top-1 bg-white py-1">
                               <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" />
                            </div>
                            <p className="text-[13px] font-bold text-[#10231d]">Submitted</p>
                            <p className="text-[11px] text-[#84908a] mt-0.5">09-10-2025 07:07 PM</p>
                         </div>
                         
                         {/* Step 2 */}
                         <div className="relative pl-7">
                            <div className="absolute -left-[9px] top-0.5 bg-white py-1">
                               <div className="w-4 h-4 rounded-full border-[3px] border-[#087f70] flex items-center justify-center bg-white shadow-sm">
                               </div>
                            </div>
                            <p className="text-[13px] font-bold text-[#10231d]">Under Review</p>
                            <p className="text-[11px] text-[#84908a] mt-0.5">09-10-2025 07:07 PM</p>
                         </div>

                         {/* Step 3 */}
                         <div className="relative pl-7">
                            <div className="absolute -left-1.5 top-1 bg-white py-1">
                               <div className="w-2.5 h-2.5 rounded-full bg-black/[0.12]"></div>
                            </div>
                            <p className="text-[13px] font-medium text-[#84908a]">Manager Approved</p>
                         </div>

                         {/* Step 4 */}
                         <div className="relative pl-7">
                            <div className="absolute -left-1.5 top-1 bg-white py-1">
                               <div className="w-2.5 h-2.5 rounded-full bg-black/[0.12]"></div>
                            </div>
                            <p className="text-[13px] font-medium text-[#84908a]">PO Created</p>
                         </div>

                         {/* Step 5 */}
                         <div className="relative pl-7">
                            <div className="absolute -left-1.5 top-1 bg-white py-1">
                               <div className="w-2.5 h-2.5 rounded-full bg-black/[0.12]"></div>
                            </div>
                            <p className="text-[13px] font-medium text-[#84908a]">PO Approved</p>
                         </div>

                      </div>
                   </div>
                </div>
             )}

             {billStatus === "active" && (
                <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                   <div className="px-6 py-5 border-b border-black/[0.06] bg-[#f9faf9]">
                      <h3 className="text-[15px] font-semibold text-[#10231d]">Recurring Summary</h3>
                   </div>
                   <CardContent className="p-6 space-y-5">
                      <div className="flex justify-between items-center">
                         <span className="text-[13px] text-[#68726d] font-medium">Total Paid to Date</span>
                         <span className="text-[13px] font-bold text-[#10231d]">₦19,600,000</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[13px] text-[#68726d] font-medium">Next Value</span>
                         <span className="text-[13px] font-bold text-[#087f70]">₦300,000</span>
                      </div>
                      <div className="pt-2">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[12px] text-[#68726d] font-medium">Until next payment</span>
                            <span className="text-[12px] font-bold text-[#10231d]">67%</span>
                         </div>
                         <Progress value={67} className="h-2 bg-black/[0.06] [&>div]:bg-[#087f70]" />
                      </div>
                   </CardContent>
                </Card>
             )}

           </div>
        </div>
      </div>
    </div>
  );
}
