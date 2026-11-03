"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetBillPayInvoiceById } from "@/queries/bill-pay";
import { format } from "date-fns";

function RegularBillDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const policies = useAuthorizationPolicies();
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  const { data: invoiceResponse, isLoading, isError } = useGetBillPayInvoiceById(id);
  const invoiceData = invoiceResponse?.data;

  // Use the API's workflowStage for the status badge, fallback to pending logic
  const currentStage = invoiceData?.workflowStage?.toLowerCase() || "awaiting_approval";

  const isSpecifyPerInvoice = 
    invoiceData?.paymentTerms?.code === "CUSTOM_0" ||
    invoiceData?.paymentTerms?.code === "VENDOR_SELECTS_DUE_DATE" ||
    (invoiceData?.paymentTerms?.name && /specify terms per invoice|vendor select/i.test(invoiceData.paymentTerms.name));

  const termsBadgeLabel = invoiceData?.paymentTerms
    ? isSpecifyPerInvoice
      ? invoiceData.paymentTerms.name || "Specify terms per invoice"
      : invoiceData.paymentTerms.days && invoiceData.paymentTerms.days > 0
        ? `${invoiceData.paymentTerms.name || `Net ${invoiceData.paymentTerms.days}`} (${invoiceData.paymentTerms.days} days)`
        : invoiceData.paymentTerms.name || "—"
    : null;

  const isOverdue = !!(
    invoiceData?.dueDate &&
    currentStage !== "paid" &&
    invoiceData?.paymentStatus !== "paid" &&
    new Date(invoiceData.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
  );

  const canApprove = policies.billPay.canApproveInvoice;

  useEffect(() => {
    setBackHandler(() => router.back());
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router]);

  const baseCurrency = invoiceData?.currency || "NGN";
  const formatter = new Intl.NumberFormat("en-NG", { style: "currency", currency: baseCurrency });

  const totalAmount = invoiceData?.totalAmount 
    ? formatter.format(parseFloat(String(invoiceData.totalAmount))) 
    : "—";

  const relatedPoNumber = invoiceData?.purchaseOrder?.poNumber || invoiceData?.poNumber;
  const relatedPoId = invoiceData?.purchaseOrder?.purchaseOrderId || invoiceData?.purchaseOrderId;

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <p className="text-gray-500">Loading invoice details...</p>
      </div>
    );
  }

  if (isError || !invoiceData) {
    return <div className="flex-1 p-8 text-gray-600">Invoice unavailable in this legal entity workspace.</div>;
  }

  return (
    <div className="flex-1 pb-8 flex flex-col">
      {/* Header Section (Sticky) */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-10 bg-[#f4f7f5] pb-4 mb-8 px-6 lg:px-8 pt-5 sm:pt-7 lg:pt-8 -mt-3 sm:-mt-5 lg:-mt-6 border-b border-black/[0.04]">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h1 className="text-[24px] font-bold text-[#10231d]">
                {invoiceData?.invoiceNumber || (id.startsWith('In-') ? id : `INV-${id.substring(0,6).toUpperCase()}`)}
              </h1>
              <StatusBadge 
                status={currentStage} 
                label={currentStage.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} 
              />
              {termsBadgeLabel && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f0faf8] text-[#087f70] border border-[#c8ece4]">
                  Terms: {termsBadgeLabel}
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#68726d]">View a detailed breakdown of the information in the invoice</p>
          </div>
          
          <div className="flex items-center gap-3">
             {currentStage === "awaiting_approval" && canApprove && (
                <Button onClick={() => router.push(`/procurement/invoices/${id}`)} className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-6">
                   Open invoice review
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
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-6">
                       {/* Row 1: Vendor, Related PO, Payment Terms, Payment Status */}
                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Vendor</p>
                          <p className="text-[13px] font-bold text-[#10231d] truncate" title={invoiceData?.vendor?.displayName || invoiceData?.vendor?.legalName || "N/A"}>
                            {invoiceData?.vendor?.displayName || invoiceData?.vendor?.legalName || "N/A"}
                          </p>
                          {invoiceData?.vendor?.displayName && invoiceData?.vendor?.legalName && (
                            <p className="text-[11px] text-[#84908a] mt-0.5 truncate" title={invoiceData.vendor.legalName}>
                              {invoiceData.vendor.legalName}
                            </p>
                          )}
                       </div>

                       <div className="min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                             <p className="text-[12px] font-medium text-[#68726d]">Related PO</p>
                             {relatedPoId && (
                                <button
                                   type="button"
                                   onClick={() => router.push(`/procurement/purchase-order/${relatedPoId}`)}
                                   className="text-[#087f70] hover:text-[#076b5e] font-semibold text-[12px] hover:underline shrink-0"
                                >
                                   View
                                </button>
                             )}
                          </div>
                          <p className="text-[13px] font-bold text-[#10231d] truncate" title={relatedPoNumber || "N/A"}>
                             {relatedPoNumber || "N/A"}
                          </p>
                       </div>

                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Payment Terms</p>
                          <p className="text-[13px] font-bold text-[#10231d] truncate" title={invoiceData?.paymentTerms?.name || "—"}>
                             {invoiceData?.paymentTerms?.name || "—"}
                          </p>
                          {isSpecifyPerInvoice ? (
                             <p className="text-[11px] text-[#087f70] font-medium mt-0.5 truncate">Specified per invoice</p>
                          ) : invoiceData?.paymentTerms?.days ? (
                             <p className="text-[11px] text-[#68726d] mt-0.5 truncate">{invoiceData.paymentTerms.days} days term</p>
                          ) : null}
                       </div>

                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Payment Status</p>
                          <div className="mt-0.5">
                             <StatusBadge 
                                status={invoiceData?.paymentStatus || "pending"} 
                                label={(invoiceData?.paymentStatus || "pending").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} 
                             />
                          </div>
                       </div>
                       
                       {/* Row 2: Dates and Legal Entity */}
                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Invoice Date</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{invoiceData?.invoiceDate ? format(new Date(invoiceData.invoiceDate), "dd-MM-yyyy") : "—"}</p>
                       </div>

                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Due Date</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                             <span className="text-[13px] font-bold text-[#10231d]">
                                {invoiceData?.dueDate ? format(new Date(invoiceData.dueDate), "dd-MM-yyyy") : "—"}
                             </span>
                             {isOverdue && (
                                <span className="text-[10px] font-semibold text-[#d33d44] bg-[#fdf2f2] px-1.5 py-0.5 rounded border border-[#fbd5d5] shrink-0">
                                   Overdue
                                </span>
                             )}
                          </div>
                       </div>

                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Delivery Date</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{invoiceData?.deliveryDate ? format(new Date(invoiceData.deliveryDate), "dd-MM-yyyy") : "—"}</p>
                       </div>

                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Legal Entity</p>
                          <p className="text-[13px] font-bold text-[#10231d] truncate" title={invoiceData?.legalEntity?.legalName || "—"}>
                            {invoiceData?.legalEntity?.legalName || "—"}
                          </p>
                       </div>
                       
                       {/* Row 3: Financials */}
                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Subtotal</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{invoiceData?.subtotal != null ? formatter.format(parseFloat(String(invoiceData.subtotal))) : "—"}</p>
                       </div>

                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Tax Amount</p>
                          <p className="text-[13px] font-bold text-[#10231d]">{invoiceData?.taxAmount ? formatter.format(parseFloat(String(invoiceData.taxAmount))) : "—"}</p>
                       </div>

                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Total Amount</p>
                          <p className="text-[13px] font-bold text-[#087f70]">{totalAmount}</p>
                       </div>

                       <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#68726d] mb-1.5">Outstanding</p>
                          <p className="text-[13px] font-bold text-[#d33d44]">{invoiceData?.outstandingAmount ? formatter.format(parseFloat(String(invoiceData.outstandingAmount))) : "—"}</p>
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
                        {invoiceData?.lineItems?.length ? invoiceData.lineItems.map((row, i) => (
                           <TableRow key={i} className="border-black/[0.04] hover:bg-[#f9faf9]/50 transition-colors">
                             <TableCell className="text-[13px] font-semibold text-[#10231d] pl-6 py-4">{row.name || row.description}</TableCell>
                             <TableCell className="text-[13px] text-[#68726d] py-4">{row.quantity ? parseFloat(String(row.quantity)) : "0"}</TableCell>
                             <TableCell className="text-[13px] text-[#68726d] py-4">{formatter.format(parseFloat(String(row.unitPrice || "0")))}</TableCell>
                             <TableCell className="text-[13px] font-semibold text-[#10231d] py-4 pr-6 text-right">{formatter.format(parseFloat(String(row.lineTotal || row.subtotal || "0")))}</TableCell>
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

           </div>

           {/* Sidebar (Right) */}
           <div className="w-full lg:w-[320px] shrink-0 space-y-6">
             
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <div className="px-6 py-5 border-b border-black/[0.04]">
                    <h3 className="text-[15px] font-bold text-[#10231d]">Payment flow</h3>
                 </div>
                 <CardContent className="p-6">
                    <div className="space-y-0">
                       
                       {/* Step 1: Submitted */}
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
                             <p className="text-[13px] font-bold text-[#10231d]">Submitted</p>
                             <p className="text-[12px] text-[#84908a] mt-1">{invoiceData?.submittedAt ? format(new Date(invoiceData.submittedAt), "dd-MM-yyyy hh:mm a") : invoiceData?.createdAt ? format(new Date(invoiceData.createdAt), "dd-MM-yyyy hh:mm a") : invoiceData?.invoiceDate ? format(new Date(invoiceData.invoiceDate), "dd-MM-yyyy hh:mm a") : "—"}</p>
                          </div>
                       </div>
                       
                       {/* Step 2: Under Review / Approved / Rejected */}
                       {currentStage === "rejected" ? (
                           <div className="flex gap-4 min-h-[72px]">
                              <div className="flex flex-col items-center">
                                 <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 bg-white z-10 mt-0.5">
                                    <svg className="w-[18px] h-[18px] text-[#d33d44]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                 </div>
                                 <div className="w-px bg-black/[0.06] flex-1 my-1"></div>
                              </div>
                              <div className="pb-6">
                                 <p className="text-[13px] font-bold text-[#d33d44]">Rejected</p>
                                 <p className="text-[12px] text-[#84908a] mt-1">{invoiceData?.rejectedAt ? format(new Date(invoiceData.rejectedAt), "dd-MM-yyyy hh:mm a") : "—"}</p>
                              </div>
                           </div>
                       ) : currentStage === "approved" || currentStage === "paid" ? (
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
                                 <p className="text-[12px] text-[#84908a] mt-1">{invoiceData?.approvedAt ? format(new Date(invoiceData.approvedAt), "dd-MM-yyyy hh:mm a") : "—"}</p>
                              </div>
                           </div>
                       ) : currentStage === "under_review" ? (
                           <div className="flex gap-4 min-h-[72px]">
                              <div className="flex flex-col items-center">
                                 <div className="w-[18px] h-[18px] rounded-full border-[2px] border-[#087f70] flex items-center justify-center shrink-0 bg-white z-10 mt-0.5">
                                 </div>
                                 <div className="w-px bg-black/[0.06] flex-1 my-1"></div>
                              </div>
                              <div className="pb-6">
                                 <p className="text-[13px] font-bold text-[#10231d]">Under Review</p>
                                 <StatusBadge status="under_review" className="mt-1.5" />
                              </div>
                           </div>
                       ) : (
                           <div className="flex gap-4 min-h-[72px]">
                              <div className="flex flex-col items-center">
                                 <div className="w-[18px] h-[18px] rounded-full border-[2px] border-[#68726d]/40 flex items-center justify-center shrink-0 bg-white z-10 mt-0.5">
                                 </div>
                                 <div className="w-px bg-black/[0.06] flex-1 my-1"></div>
                              </div>
                              <div className="pb-6">
                                 <p className="text-[13px] font-bold text-[#68726d]">Approval</p>
                                 <StatusBadge status="pending" className="mt-1.5" />
                              </div>
                           </div>
                       )}

                       {/* Step 3: Paid */}
                       {currentStage === "paid" || invoiceData?.paymentStatus === "paid" ? (
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
                                 <p className="text-[12px] text-[#84908a] mt-1">{invoiceData?.paidAt ? format(new Date(invoiceData.paidAt), "dd-MM-yyyy hh:mm a") : "—"}</p>
                              </div>
                           </div>
                       ) : (
                           <div className="flex gap-4 min-h-[40px]">
                              <div className="flex flex-col items-center">
                                 <div className="w-[18px] h-[18px] rounded-full border-[2px] border-[#68726d]/40 flex items-center justify-center shrink-0 bg-white z-10 mt-0.5">
                                 </div>
                              </div>
                              <div className="pb-0">
                                 <p className="text-[13px] font-bold text-[#68726d]">Payment</p>
                                 <StatusBadge status={invoiceData?.paymentStatus || "pending"} className="mt-1.5" />
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
