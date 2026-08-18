"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Pencil, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const MOCK_INVOICE: Record<string, { vendor: string, amount: string }> = {
  "INV-2025-081": { vendor: "billing@aws.com", amount: "₦142,500.00" },
  "INV-2025-082": { vendor: "QuickBooks Integration", amount: "₦85,000.00" },
};

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  const [viewRole, setViewRole] = useState<"creator" | "approver">("creator");
  const [status, setStatus] = useState<"Pending" | "Approved">("Pending");

  useEffect(() => {
    setBackHandler(() => router.back());
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router]);

  const billData = MOCK_INVOICE[id] || { vendor: "Acme Ltd", amount: "₦500,000" };

  return (
    <div className="flex-1 pb-8 flex flex-col">
      {/* Demo Controls - ONLY FOR TESTING THE VIEWS */}
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
           <select className="bg-white border border-[#087f70]/30 rounded-[6px] px-2 py-1 text-[#10231d] outline-none shadow-sm" value={status} onChange={(e) => setStatus(e.target.value as "Pending" | "Approved")}>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
           </select>
        </div>
      </div>

      {/* Header Section (Sticky) */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-10 bg-[#f4f7f5] pb-4 mb-8 px-6 lg:px-8 pt-5 sm:pt-7 lg:pt-8 -mt-3 sm:-mt-5 lg:-mt-6">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[24px] font-bold text-[#10231d]">{billData.vendor}</h1>
              {status === "Pending" ? (
                 <Badge variant="outline" className="bg-[#fffbeb] text-[#d97706] border-[#fcd34d] text-[12px] font-medium h-6 px-2.5 rounded-full">
                    Pending
                 </Badge>
              ) : (
                 <Badge variant="outline" className="bg-[#f0faf8] text-[#087f70] border-[#087f70]/30 text-[12px] font-medium h-6 px-2.5 rounded-full">
                    Approved
                 </Badge>
              )}
            </div>
            <p className="text-[13px] text-[#68726d]">Cloud Services • {id}</p>
          </div>
          
          <div className="flex items-center gap-3">
             {status === "Pending" && viewRole === "creator" && (
                <>
                   <Button variant="outline" className="text-[#087f70] border-[#087f70]/30 hover:bg-[#f0faf8] hover:text-[#076b5e] h-10 rounded-[8px] font-semibold text-[13px] px-5">
                      <Pencil className="w-4 h-4 mr-2" /> Edit Bill
                   </Button>
                   <Button className="bg-[#d33d44] hover:bg-[#b9353c] text-white h-10 rounded-[8px] font-semibold text-[13px] px-5">
                      <XCircle className="w-4 h-4 mr-2" /> Withdraw Bill
                   </Button>
                </>
             )}
             {status === "Pending" && viewRole === "approver" && (
                <>
                   <Button variant="outline" className="text-[#d33d44] border-red-200 hover:bg-red-50 hover:text-red-700 h-10 rounded-[8px] font-semibold text-[13px] px-6">
                      Reject Bill
                   </Button>
                   <Button className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-6">
                      Approve Bill
                   </Button>
                </>
             )}
             {status === "Approved" && (
                 <Button className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-6">
                    Download PDF
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
              
              {/* Amount Overview */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <CardContent className="p-6">
                    <div className="mb-1">
                       <span className="text-[28px] font-bold text-[#087f70]">{billData.amount}</span>
                    </div>
                    <p className="text-[13px] font-bold text-[#10231d] mb-6">Office supplies</p>
                    
                    <div className="grid grid-cols-3 gap-4 border-t border-black/[0.04] pt-4">
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">INVOICE DATE</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Jan 1, 2025</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">DUE DATE</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Jan 1, 2025</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">PURCHASE ORDER</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">N/A</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Payment Configuration */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <CardContent className="p-6">
                    <h3 className="text-[15px] font-bold text-[#10231d] mb-4">Payment Configuration</h3>
                    
                    <div className="grid grid-cols-3 gap-6 mb-6">
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">PAYMENT METHOD</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Bank Transfer</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">BENEFICIARY NAME</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Acme Corp</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">BENEFICIARY BANK</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Ocean bank</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6">
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">ACCOUNT NUMBER</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">123-43535-53523</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">SORT CODE</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">057-434244</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">AUTHORIZATION</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">Approval Required</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Bill Item Breakdown */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <CardHeader className="p-6 border-b border-black/[0.04]">
                    <div className="flex items-center gap-3">
                       <h3 className="text-[15px] font-bold text-[#10231d]">Bill Item Breakdown</h3>
                       <Badge variant="secondary" className="bg-[#f4f7f5] text-[#10231d] hover:bg-[#f4f7f5] rounded-full h-6 px-2.5 font-semibold text-[12px]">
                         5
                       </Badge>
                    </div>
                 </CardHeader>
                 <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-[#f9faf9]">
                        <TableRow className="border-black/[0.08] hover:bg-transparent">
                          <TableHead className="h-11 text-[12px] font-semibold text-[#68726d] pl-6 w-[40%]">Description</TableHead>
                          <TableHead className="h-11 text-[12px] font-semibold text-[#68726d]">Qty</TableHead>
                          <TableHead className="h-11 text-[12px] font-semibold text-[#68726d]">Unit Price</TableHead>
                          <TableHead className="h-11 text-[12px] font-semibold text-[#68726d] pr-6 text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { name: "Heavy Duty Pallets", qty: 10, price: "₦4,000", total: "₦40,000" },
                          { name: "Industrial Shrink Wrap", qty: 10, price: "₦4,000", total: "₦40,000" },
                          { name: "Heavy Duty Pallets", qty: 10, price: "₦4,000", total: "₦40,000" },
                          { name: "Industrial Shrink Wrap", qty: 10, price: "₦4,000", total: "₦40,000" },
                          { name: "Heavy Duty Pallets", qty: 10, price: "₦4,000", total: "₦40,000" }
                        ].map((row, i) => (
                           <TableRow key={i} className="border-black/[0.04] hover:bg-[#f9faf9]/50 transition-colors">
                             <TableCell className="text-[13px] font-semibold text-[#10231d] pl-6 py-4">{row.name}</TableCell>
                             <TableCell className="text-[13px] text-[#68726d] py-4">{row.qty}</TableCell>
                             <TableCell className="text-[13px] text-[#68726d] py-4">{row.price}</TableCell>
                             <TableCell className="text-[13px] font-semibold text-[#10231d] py-4 pr-6 text-right">{row.total}</TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                 </CardContent>
              </Card>

           </div>

           {/* Sidebar (Right) */}
           <div className="w-full lg:w-[320px] shrink-0 space-y-6">
             
              {/* Workflow Progress */}
              <div className="bg-white rounded-[14px] border border-black/[0.06] shadow-sm overflow-hidden">
                 <div className="bg-[#1C2B36] rounded-t-[14px] px-6 py-4">
                    <h3 className="text-[15px] font-bold text-white">Workflow Progress</h3>
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
                          <div className="absolute -left-[11px] -top-1 bg-white py-1">
                             <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" />
                          </div>
                          <p className="text-[13px] font-bold text-[#10231d]">Under Review</p>
                          <p className="text-[11px] text-[#84908a] mt-0.5">09-10-2025 07:07 PM</p>
                       </div>

                       {/* Step 3 */}
                       <div className="relative pl-7">
                          <div className="absolute -left-[9px] top-0.5 bg-white py-1">
                             <div className="w-4 h-4 rounded-full border-[3px] border-black/[0.12] flex items-center justify-center bg-white shadow-sm">
                             </div>
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

                    </div>
                 </div>
              </div>

              {/* Documents */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <div className="px-6 py-5 border-b border-black/[0.04]">
                    <h3 className="text-[15px] font-bold text-[#10231d]">Documents</h3>
                 </div>
                 <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-50 border border-red-100 rounded-[8px]">
                             <FileText className="w-4 h-4 text-red-500" />
                          </div>
                          <span className="text-[13px] font-medium text-[#10231d]">Invoice.pdf</span>
                       </div>
                       <Button variant="link" className="text-[#087f70] font-semibold text-[12px] h-auto p-0 hover:text-[#076b5e]">Download</Button>
                    </div>
                 </CardContent>
              </Card>

           </div>
        </div>
      </div>
    </div>
  );
}
