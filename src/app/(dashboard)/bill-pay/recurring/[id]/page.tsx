"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import withPermissions from "@/components/permissions/permission-protected-routes";

const MOCK_RECURRING: Record<string, { vendor: string, amount: string, freq: string }> = {
  "00041": { vendor: "Atlas Partners", amount: "₦4,200,000", freq: "Weekly" },
  "00042": { vendor: "Atlas Partners", amount: "₦4,200,000", freq: "Weekly" },
  "00043": { vendor: "Atlas Partners", amount: "₦4,200,000", freq: "Weekly" },
  "00044": { vendor: "Atlas Partners", amount: "₦4,200,000", freq: "Weekly" },
  "00045": { vendor: "Atlas Partners", amount: "₦4,200,000", freq: "Weekly" },
};

function RecurringBillDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  const policies = useAuthorizationPolicies();
  const [demoScenario, setDemoScenario] = useState<"normal" | "discrepancy" | "insufficient_funds">("normal");
  const [showApprovalModal, setShowApprovalModal] = useState(false);

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
           <span className="text-[#087f70] font-semibold">Demo Scenario:</span>
           <select className="bg-white border border-[#087f70]/30 rounded-[6px] px-2 py-1 text-[#10231d] outline-none shadow-sm" value={demoScenario} onChange={(e) => setDemoScenario(e.target.value as any)}>
              <option value="normal">Normal (Confirmed)</option>
              <option value="discrepancy">Amount Discrepancy</option>
              <option value="insufficient_funds">Insufficient Funds</option>
           </select>
        </div>
      </div>

      {/* Header Section (Sticky) */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-10 bg-[#f4f7f5] pb-4 mb-8 px-6 lg:px-8 pt-5 sm:pt-7 lg:pt-8 -mt-3 sm:-mt-5 lg:-mt-6">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[24px] font-bold text-[#10231d]">{billData.vendor}</h1>
              <StatusBadge status="approved" label="Active" />
            </div>
            <p className="text-[13px] text-[#68726d]">Cloud Services • REC-{id || "0089"}</p>
          </div>
          
          <div className="flex items-center gap-3">
             {demoScenario === "discrepancy" ? (
                <>
                   <Button variant="outline" className="text-[#d33d44] border-red-200 hover:bg-red-50 hover:text-red-700 h-10 rounded-[8px] font-semibold text-[13px] px-6">
                      Reject Bill
                   </Button>
                   <Button onClick={() => setShowApprovalModal(true)} className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-6">
                      Approve New Bill
                   </Button>
                </>
             ) : (
                <Button variant="outline" className="text-[#087f70] border-[#087f70]/30 hover:bg-[#f0faf8] hover:text-[#076b5e] h-10 rounded-[8px] font-semibold text-[13px] px-5">
                   <Pencil className="w-4 h-4 mr-2" /> Update billing
                </Button>
             )}
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 max-w-[1200px] mx-auto w-full">
        {/* Layout Grid */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
           
           {/* Main Content (Left) */}
           <div className="flex-1 space-y-6 min-w-0 w-full">
              
              {/* Banners */}
              {demoScenario === "discrepancy" && (
                <div className="bg-[#fffbeb] border border-[#fef3c7] rounded-[10px] p-4 flex gap-3 mb-6 items-start">
                   <div className="text-amber-500 mt-0.5">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                   </div>
                   <div>
                     <h4 className="text-[13px] font-bold text-amber-800">Amount Discrepancy Detected</h4>
                     <p className="text-[13px] text-amber-700 mt-0.5">The actual invoice amount (₦390,000) differs from your expected scheduled amount (₦300,000). This variation of +17.5% exceeds your preset ±10% auto-approval tolerance threshold.</p>
                   </div>
                </div>
              )}
              {demoScenario === "insufficient_funds" && (
                <div className="bg-red-50 border border-red-100 rounded-[10px] p-4 flex gap-3 mb-6 items-start">
                   <div className="text-red-500 mt-0.5">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                   </div>
                   <div>
                     <h4 className="text-[13px] font-bold text-red-800">Insufficient Funds</h4>
                     <p className="text-[13px] text-red-700 mt-0.5">Your payment could not be processed.</p>
                   </div>
                </div>
              )}

              {/* Schedule Information */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <CardContent className="p-6">
                    <div className="mb-6">
                       <span className="text-[28px] font-bold text-[#087f70]">
                          {demoScenario === "discrepancy" || demoScenario === "insufficient_funds" ? "₦390,000" : billData.amount}
                       </span>
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

              {/* Payment History */}
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
                                <StatusBadge status="paid" />
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
           </div>

           {/* Sidebar (Right) */}
           <div className="w-full lg:w-[320px] shrink-0 space-y-6">
             
             {/* Sidebar Content is only the Summary for now, based on Figma */}

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

           </div>
        </div>
      </div>

      {/* Modal for Discrepancy Approval */}
      {showApprovalModal && (
         <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[16px] shadow-xl w-full max-w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="p-6">
                  <h2 className="text-[18px] font-bold text-[#10231d] mb-2">Approve New Amount</h2>
                  <p className="text-[13px] text-[#68726d] mb-6">How would you like to apply this new amount of ₦390,000?</p>
                  
                  <div className="space-y-3">
                     <label className="flex items-start gap-3 p-4 rounded-[10px] border border-[#087f70] bg-[#f0faf8] cursor-pointer">
                        <div className="mt-0.5">
                           <div className="w-4 h-4 rounded-full border-[5px] border-[#087f70] bg-white"></div>
                        </div>
                        <div>
                           <p className="text-[13px] font-bold text-[#10231d]">Apply to all future bills</p>
                           <p className="text-[12px] text-[#68726d] mt-0.5">The new amount will be used for all upcoming scheduled payments.</p>
                        </div>
                     </label>

                     <label className="flex items-start gap-3 p-4 rounded-[10px] border border-black/[0.08] hover:bg-[#f9faf9] cursor-pointer">
                        <div className="mt-0.5">
                           <div className="w-4 h-4 rounded-full border-[1.5px] border-black/[0.24]"></div>
                        </div>
                        <div>
                           <p className="text-[13px] font-bold text-[#10231d]">Just this time</p>
                           <p className="text-[12px] text-[#68726d] mt-0.5">Only this payment will use the new amount. Future bills will use the original amount of ₦300,000.</p>
                        </div>
                     </label>
                  </div>
               </div>
               
               <div className="p-4 bg-[#f9faf9] border-t border-black/[0.06] flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowApprovalModal(false)} className="text-[#52605b] border-black/[0.08] hover:bg-[#f5f7f6] rounded-[8px] font-semibold">
                     Cancel
                  </Button>
                  <Button onClick={() => setShowApprovalModal(false)} className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] font-semibold">
                     Confirm Approval
                  </Button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

export default withPermissions(RecurringBillDetailsPage, [
  { resource: "bill_pay.invoice", action: "view" },
]);
