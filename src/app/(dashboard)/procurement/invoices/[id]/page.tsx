"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetProcurementInvoiceById, useInvoiceAction, useInvoicePaymentAction } from "@/queries/procurement/invoices";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ProcurementInvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const policies = useAuthorizationPolicies();
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  const { data: invoiceResponse, isLoading } = useGetProcurementInvoiceById(id);
  const invoiceData = invoiceResponse?.data;

  const paymentAction = useInvoicePaymentAction();
  const action = useInvoiceAction();

  const runAction = async (next: "under-review" | "approve" | "reject") => {
    try { 
      await action.mutateAsync({ invoiceId: id, action: next }); 
      toast.success(next === "approve" ? "Invoice approved and posted" : next === "under-review" ? "Invoice moved into review" : "Invoice rejected"); 
    } catch { 
      toast.error("Invoice action could not be completed"); 
    }
  };

  const recordPayment = async () => {
    try {
      await paymentAction.mutateAsync({ invoiceId: id, paymentStatus: "paid" });
      toast.success("Payment recorded successfully");
    } catch {
      toast.error("Failed to record payment");
    }
  };

  // Use the API's workflowStage or status for the badge
  const currentStage = (invoiceData?.workflowStage || invoiceData?.status)?.toLowerCase() || "awaiting_approval";

  const canApprove = policies.vendorInvoices?.canApprove;

  useEffect(() => {
    setBackHandler(() => router.back());
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router]);

  const baseCurrency = invoiceData?.currency || "NGN";
  const formatter = new Intl.NumberFormat("en-NG", { style: "currency", currency: baseCurrency });

  const totalAmount = invoiceData?.totalAmount 
    ? formatter.format(parseFloat(invoiceData.totalAmount)) 
    : "—";

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center h-full">
        <p className="text-gray-500">Loading invoice details...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 pb-8 flex flex-col min-h-0 overflow-auto">
      {/* Header Section (Sticky) */}
      <div className="sticky top-0 z-10 bg-[#f4f7f5] pb-4 mb-8 px-6 lg:px-8 pt-5 sm:pt-7 lg:pt-8 border-b border-black/[0.04]">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[24px] font-bold text-[#10231d]">
                {invoiceData?.invoiceNumber || (id.startsWith('In-') ? id : `INV-${id.substring(0,6).toUpperCase()}`)}
              </h1>
              <StatusBadge 
                status={currentStage} 
                label={currentStage.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} 
              />
            </div>
            <p className="text-[13px] text-[#68726d]">View a detailed breakdown of the information in the procurement invoice</p>
          </div>
          
          <div className="flex items-center gap-3">
             {currentStage === "submitted" && policies.vendorInvoices?.canReview && (
                <Button onClick={() => runAction("under-review")} className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-6">
                   Review Invoice
                </Button>
             )}
             {currentStage === "under_review" && canApprove && (
                <>
                   <Button onClick={() => runAction("reject")} variant="outline" className="text-[#d33d44] border-red-200 hover:bg-red-50 hover:text-red-700 h-10 rounded-[8px] font-semibold text-[13px] px-6">
                      Reject Invoice
                   </Button>
                   <Button onClick={() => runAction("approve")} className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-6">
                      Approve Invoice
                   </Button>
                </>
             )}
             {currentStage === "approved" && (
                <Button onClick={recordPayment} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white h-10 rounded-[8px] font-semibold text-[13px] px-6">
                   Record Payment
                </Button>
             )}
             {(currentStage === "approved" || currentStage === "paid") && (
                <Button variant="outline" className="h-10 rounded-[8px] font-semibold text-[13px] px-6 text-[#10231d] border-black/[0.12] hover:bg-gray-50">
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4">
                       {/* Row 1 */}
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Vendor</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{invoiceData?.vendor?.displayName || invoiceData?.vendor?.legalName || "N/A"}</p>
                       </div>
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Related PO</p>
                          <p className="text-[13px] font-bold text-[#10231d] flex items-center gap-2">
                             {invoiceData?.purchaseOrder?.poNumber || invoiceData?.poNumber || "N/A"}
                             {(invoiceData?.purchaseOrder || invoiceData?.poNumber) && (
                                <Button variant="link" className="h-auto p-0 text-[#087f70] font-semibold text-[12px] hover:text-[#076b5e]">View</Button>
                             )}
                          </p>
                       </div>
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Invoice Date</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{invoiceData?.invoiceDate ? format(new Date(invoiceData.invoiceDate), "dd-MM-yyyy") : "N/A"}</p>
                       </div>
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Due Date</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{invoiceData?.dueDate ? format(new Date(invoiceData.dueDate), "dd-MM-yyyy") : "N/A"}</p>
                       </div>
                       
                       {/* Row 2 */}
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Subtotal</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{invoiceData?.subtotal ? formatter.format(parseFloat(invoiceData.subtotal)) : "—"}</p>
                       </div>
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Tax Amount</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{invoiceData?.taxAmount ? formatter.format(parseFloat(invoiceData.taxAmount)) : "—"}</p>
                       </div>
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Total Amount</p>
                          <p className="text-[13px] font-bold text-[#087f70]">{totalAmount}</p>
                       </div>
                       <div>
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Outstanding</p>
                          <p className="text-[13px] font-bold text-[#d33d44]">{invoiceData?.outstandingAmount ? formatter.format(parseFloat(invoiceData.outstandingAmount)) : "—"}</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Invoice Items */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <CardHeader className="p-6 border-b border-black/[0.04]">
                    <div className="flex items-center gap-3">
                       <h3 className="text-[15px] font-bold text-[#10231d]">Invoice Items</h3>
                       <StatusBadge status="provisional" label={(invoiceData?.lineItems?.length || 0).toString()} className="bg-[#f4f7f5] text-[#10231d] border-transparent" />
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
                        {invoiceData?.lineItems?.length ? invoiceData.lineItems.map((row: any, i: number) => (
                           <TableRow key={i} className="border-black/[0.04] hover:bg-[#f9faf9]/50 transition-colors">
                             <TableCell className="text-[13px] font-semibold text-[#10231d] pl-6 py-4">{row.name || row.description}</TableCell>
                             <TableCell className="text-[13px] text-[#68726d] py-4">{row.quantity ? parseFloat(row.quantity) : "0"}</TableCell>
                             <TableCell className="text-[13px] text-[#68726d] py-4">{formatter.format(parseFloat(row.unitPrice || "0"))}</TableCell>
                             <TableCell className="text-[13px] font-semibold text-[#10231d] py-4 pr-6 text-right">{formatter.format(parseFloat(row.lineTotal || row.subtotal || "0"))}</TableCell>
                           </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-gray-500">No items found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    
                    <div className="p-6 flex justify-end items-center gap-6 border-t border-black/[0.08]">
                       <span className="text-[14px] font-semibold text-[#68726d]">Total Amount</span>
                       <span className="text-[18px] font-bold text-[#10231d]">{totalAmount}</span>
                    </div>
                 </CardContent>
              </Card>

              {/* Accounting Sync Info */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                <CardHeader className="p-6 border-b border-black/[0.04]">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[15px] font-bold text-[#10231d]">Accounting Sync</h3>
                    <StatusBadge status={invoiceData?.accountingSyncStatus || "pending"} label={invoiceData?.accountingSyncStatus ? invoiceData.accountingSyncStatus.replace("_", " ") : "Pending"} className="bg-[#f4f7f5] text-[#10231d] border-transparent capitalize" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4">
                    <div>
                      <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Sync Status</p>
                      <p className="text-[13px] font-bold text-[#10231d] capitalize">{invoiceData?.accountingSyncStatus ? invoiceData.accountingSyncStatus.replace("_", " ") : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Synced At</p>
                      <p className="text-[13px] font-bold text-[#10231d]">{invoiceData?.accountingSyncedAt ? format(new Date(invoiceData.accountingSyncedAt), "dd-MM-yyyy hh:mm a") : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#68726d] mb-1.5">External Reference</p>
                      <p className="text-[13px] font-bold text-[#10231d] break-all">{invoiceData?.externalAccountingRef || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Sync Error</p>
                      <p className="text-[13px] font-bold text-[#d33d44]">{invoiceData?.accountingSyncError || "None"}</p>
                    </div>
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
                       
                       {/* Step 1: Sent / Created */}
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
                             <p className="text-[13px] font-bold text-[#10231d]">Created</p>
                             <p className="text-[12px] text-[#84908a] mt-1">{invoiceData?.createdAt ? format(new Date(invoiceData.createdAt), "dd-MM-yyyy hh:mm a") : "—"}</p>
                          </div>
                       </div>
                       
                       {/* Step 2: Approved */}
                       {currentStage === "approved" || currentStage === "paid" ? (
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
                                 <p className="text-[12px] text-[#84908a] mt-1">—</p>
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
                                 <StatusBadge status="pending" className="mt-1.5" />
                              </div>
                           </div>
                       )}

                       {/* Step 3: Paid */}
                       {currentStage === "paid" ? (
                           <div className="flex gap-4 min-h-[40px]">
                              <div className="flex flex-col items-center">
                                 <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 bg-white z-10 mt-0.5">
                                    <svg className="w-[18px] h-[18px] text-[#087f70]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                 </div>
                              </div>
                              <div className="pb-0">
                                 <p className="text-[13px] font-bold text-[#10231d]">Paid</p>
                                 <p className="text-[12px] text-[#84908a] mt-1">—</p>
                              </div>
                           </div>
                       ) : (
                           <div className="flex gap-4 min-h-[40px]">
                              <div className="flex flex-col items-center">
                                 <div className="w-[18px] h-[18px] rounded-full border-[2px] border-[#087f70] flex items-center justify-center shrink-0 bg-white z-10 mt-0.5">
                                 </div>
                              </div>
                              <div className="pb-0">
                                 <p className="text-[13px] font-bold text-[#10231d]">Paid</p>
                                 <StatusBadge status="pending" className="mt-1.5" />
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
