"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-stores";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
const MOCK_DATA: Record<string, { vendor: string, amount: string }> = {
  "atlas-partners": { vendor: "Atlas Partners", amount: "₦12,500,000.00" },
  "nexa-solutions": { vendor: "Nexa Solutions", amount: "₦3,200,000.00" },
  "global-office-supplies": { vendor: "Global Office Supplies", amount: "₦1,450,000.00" },
  "techcorp-inc.": { vendor: "TechCorp Inc.", amount: "₦8,900,000.00" },
  "marketing-masters": { vendor: "Marketing Masters", amount: "₦5,600,000.00" },
};

function RegularBillDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { can } = useAuthStore();
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  const [status, setStatus] = useState<"Pending" | "Approved">("Pending");

  const canEdit = can("bill_pay.invoice", "edit");
  const canApprove = can("bill_pay.invoice", "approve");

  useEffect(() => {
    setBackHandler(() => router.back());
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router]);

  const billData = MOCK_DATA[id] || { 
    vendor: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), 
    amount: "₦200,000" 
  };

  return (
    <div className="flex-1 pb-8 flex flex-col">
      {/* Header Section (Sticky) */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-10 bg-[#f4f7f5] pb-4 mb-8 px-6 lg:px-8 pt-5 sm:pt-7 lg:pt-8 -mt-3 sm:-mt-5 lg:-mt-6">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[24px] font-bold text-[#10231d]">{id.startsWith('In-') ? id : `INV-${id.substring(0,6).toUpperCase()}`}</h1>
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
            <p className="text-[13px] text-[#68726d]">View a detailed breakdown of the information in the invoice</p>
          </div>
          
          <div className="flex items-center gap-3">
             {status === "Pending" && (
                <>
                   <Button variant="outline" className="text-[#d33d44] border-red-200 hover:bg-red-50 hover:text-red-700 h-10 rounded-[8px] font-semibold text-[13px] px-6" onClick={() => setStatus("Approved")}>
                      Reject Invoice
                   </Button>
                   <Button className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-6" onClick={() => setStatus("Approved")}>
                      Approve Bill
                   </Button>
                </>
             )}
             {status === "Approved" && (
                <Button className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-6" onClick={() => setStatus("Pending")}>
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
              
              {/* Summary */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <CardHeader className="p-6 border-b border-black/[0.04]">
                    <h3 className="text-[15px] font-bold text-[#10231d]">Summary</h3>
                 </CardHeader>
                 <CardContent className="p-6">
                    <div className="grid grid-cols-4 gap-4">
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Vendor</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{billData.vendor}</p>
                       </div>
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Total Amount</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{billData.amount}</p>
                       </div>
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Related PO</p>
                          <p className="text-[13px] font-bold text-[#10231d] flex items-center gap-2">
                             PO-2024-001
                             <Button variant="link" className="h-auto p-0 text-[#087f70] font-semibold text-[12px] hover:text-[#076b5e]">View</Button>
                          </p>
                       </div>
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Due Date</p>
                          <p className="text-[13px] font-bold text-[#10231d]">09-10-2025</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Invoice Items */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <CardHeader className="p-6 border-b border-black/[0.04]">
                    <div className="flex items-center gap-3">
                       <h3 className="text-[15px] font-bold text-[#10231d]">Invoice Items</h3>
                       <Badge variant="secondary" className="bg-[#f4f7f5] text-[#10231d] hover:bg-[#f4f7f5] rounded-full h-6 px-2.5 font-semibold text-[12px]">
                         5
                       </Badge>
                    </div>
                 </CardHeader>
                 <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-[#f9faf9]">
                        <TableRow className="border-black/[0.08] hover:bg-transparent">
                          <TableHead className="h-11 text-[12px] font-semibold text-[#68726d] pl-6 w-[40%]">Name</TableHead>
                          <TableHead className="h-11 text-[12px] font-semibold text-[#68726d]">Quantity</TableHead>
                          <TableHead className="h-11 text-[12px] font-semibold text-[#68726d]">Unit Price</TableHead>
                          <TableHead className="h-11 text-[12px] font-semibold text-[#68726d] pr-6 text-right">Total</TableHead>
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
                    
                    <div className="p-6 flex justify-end items-center gap-6 border-t border-black/[0.08]">
                       <span className="text-[14px] font-semibold text-[#68726d]">Total Amount</span>
                       <span className="text-[18px] font-bold text-[#10231d]">₦200,000</span>
                    </div>
                 </CardContent>
              </Card>

           </div>

           {/* Sidebar (Right) */}
           <div className="w-full lg:w-[320px] shrink-0 space-y-6">
             
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <div className="px-6 py-5 border-b border-black/[0.04]">
                    <h3 className="text-[15px] font-bold text-[#10231d]">Payment flow</h3>
                 </div>
                 <CardContent className="p-6">
                    <div className="space-y-0">
                       
                       {/* Step 1: Sent */}
                       <div className="flex gap-4 min-h-[72px]">
                          <div className="flex flex-col items-center">
                             <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 bg-white z-10 mt-0.5">
                                <svg className="w-[18px] h-[18px] text-[#087f70]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                             </div>
                             <div className="w-px bg-black/[0.06] flex-1 my-1"></div>
                          </div>
                          <div className="pb-6">
                             <p className="text-[13px] font-bold text-[#10231d]">Sent</p>
                             <p className="text-[12px] text-[#84908a] mt-1">09-10-2025 07:07 PM</p>
                          </div>
                       </div>
                       
                       {/* Step 2: Approved */}
                       {status === "Approved" ? (
                           <div className="flex gap-4 min-h-[72px]">
                              <div className="flex flex-col items-center">
                                 <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 bg-white z-10 mt-0.5">
                                    <svg className="w-[18px] h-[18px] text-[#087f70]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                 </div>
                                 <div className="w-px bg-black/[0.06] flex-1 my-1"></div>
                              </div>
                              <div className="pb-6">
                                 <p className="text-[13px] font-bold text-[#10231d]">Approved</p>
                                 <p className="text-[12px] text-[#84908a] mt-1">09-10-2025 07:07 PM</p>
                              </div>
                           </div>
                       ) : (
                           <div className="flex gap-4 min-h-[72px]">
                              <div className="flex flex-col items-center">
                                 <div className="w-[18px] h-[18px] rounded-full border-[2px] border-[#087f70] flex items-center justify-center shrink-0 bg-white z-10 mt-0.5">
                                 </div>
                                 <div className="w-px bg-black/[0.06] flex-1 my-1"></div>
                              </div>
                              <div className="pb-6">
                                 <p className="text-[13px] font-bold text-[#10231d]">Approved</p>
                                 <Badge variant="outline" className="bg-transparent text-[#d97706] border-[#fcd34d] font-medium text-[11px] h-5 mt-1.5 px-2 rounded-[6px]">Pending</Badge>
                              </div>
                           </div>
                       )}

                       {/* Step 3: Paid */}
                       {status === "Approved" && (
                           <div className="flex gap-4 min-h-[40px]">
                              <div className="flex flex-col items-center">
                                 <div className="w-[18px] h-[18px] rounded-full border-[2px] border-[#087f70] flex items-center justify-center shrink-0 bg-white z-10 mt-0.5">
                                 </div>
                              </div>
                              <div className="pb-0">
                                 <p className="text-[13px] font-bold text-[#10231d]">Paid</p>
                                 <p className="text-[12px] text-[#84908a] mt-1">09-10-2025 08:07 PM</p>
                              </div>
                           </div>
                       )}

                    </div>
                 </CardContent>
              </Card>

           </div>
        </div>
      </div>
    </div>
  );
}

export default withPermissions(RegularBillDetailsPage, [
  { resource: "bill_pay.invoice", action: "view" },
]);
