"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Pencil, XCircle, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useGetBillPayIntakeById, useSubmitBillPayIntake, useRetryBillPayIntake, useCancelBillPayIntake } from "@/queries/bill-pay";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  const policies = useAuthorizationPolicies();

  const { data, isLoading } = useGetBillPayIntakeById(id);
  const intake = data?.data;
  const submitIntake = useSubmitBillPayIntake();
  const retryIntake = useRetryBillPayIntake();
  const cancelIntake = useCancelBillPayIntake();

  useEffect(() => {
    setBackHandler(() => router.back());
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router]);

  if (isLoading) {
    return (
      <div className="flex-1 pb-8 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#087f70] mb-4" />
        <p className="text-[#68726d] text-sm">Loading intake details...</p>
      </div>
    );
  }

  if (!intake) {
    return (
      <div className="flex-1 pb-8 flex flex-col items-center justify-center">
        <p className="text-[#68726d] text-sm mb-4">Intake not found or could not be loaded.</p>
        <Button onClick={() => router.back()} variant="outline">Go Back</Button>
      </div>
    );
  }

  const structuredInput = intake.structuredInput || {};
  const lineItems = Array.isArray(structuredInput.lineItems) ? structuredInput.lineItems : [];
  const paymentMethod = structuredInput.paymentMethod || "N/A";
  const beneficiaryName = structuredInput.beneficiaryName || "N/A";
  const beneficiaryBank = structuredInput.beneficiaryBank || "N/A";
  const accountNumber = structuredInput.accountNumber || "N/A";
  const invoiceDate = structuredInput.invoiceDate ? format(new Date(structuredInput.invoiceDate), "MMM d, yyyy") : "N/A";
  const dueDate = structuredInput.dueDate ? format(new Date(structuredInput.dueDate), "MMM d, yyyy") : "N/A";
  
  const totalAmount = lineItems.reduce((acc: number, item: any) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  const formattedAmount = totalAmount > 0 ? `₦${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A";

  // Compute a display status that matches StatusBadge props
  const rawStatus = intake.status.toLowerCase();
  let statusVariant: "pending" | "approved" | "rejected" | "default" = "default";
  if (["received", "validating", "queued"].includes(rawStatus)) statusVariant = "pending";
  if (["processed", "completed"].includes(rawStatus)) statusVariant = "approved";
  if (["failed", "rejected", "cancelled"].includes(rawStatus)) statusVariant = "rejected";

  return (
    <div className="flex-1 pb-8 flex flex-col">
      {/* Header Section (Sticky) */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-10 bg-[#f4f7f5] pb-4 mb-8 px-6 lg:px-8 pt-5 sm:pt-7 lg:pt-8 -mt-3 sm:-mt-5 lg:-mt-6">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[24px] font-bold text-[#10231d]">{intake.externalReference || intake.senderName || "Unknown Vendor"}</h1>
              <StatusBadge status={statusVariant} label={rawStatus} className="capitalize" />
            </div>
            <p className="text-[13px] text-[#68726d] capitalize">{intake.source.replace(/_/g, " ")} • {id.split('-')[0].toUpperCase()}</p>
          </div>
          
          <div className="flex items-center gap-3">
             {statusVariant === "pending" && policies.billPay.canEditInvoice && (
                <>
                   <Button variant="outline" className="text-[#087f70] border-[#087f70]/30 hover:bg-[#f0faf8] hover:text-[#076b5e] h-10 rounded-[8px] font-semibold text-[13px] px-5">
                      <Pencil className="w-4 h-4 mr-2" /> Edit Intake
                   </Button>
                   <Button 
                      onClick={async () => {
                         try {
                            await submitIntake.mutateAsync(id);
                            toast.success("Intake submitted for review successfully");
                         } catch (err) {
                            toast.error("Failed to submit intake");
                         }
                      }}
                      disabled={submitIntake.isPending}
                      className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-5"
                   >
                      {submitIntake.isPending ? "Submitting..." : "Submit for Review"}
                   </Button>
                   <Button 
                      variant="outline" 
                      className="text-[#d33d44] border-red-200 hover:bg-red-50 hover:text-red-700 h-10 rounded-[8px] font-semibold text-[13px] px-5"
                      onClick={async () => {
                         try {
                            await cancelIntake.mutateAsync(id);
                            toast.success("Intake cancelled successfully");
                         } catch (err) {
                            toast.error("Failed to cancel intake");
                         }
                      }}
                      disabled={cancelIntake.isPending}
                   >
                      <XCircle className="w-4 h-4 mr-2" /> {cancelIntake.isPending ? "Cancelling..." : "Cancel"}
                   </Button>
                </>
             )}
             {rawStatus === "failed" && policies.billPay.canEditInvoice && (
                <>
                   <Button 
                      onClick={async () => {
                         try {
                            await retryIntake.mutateAsync(id);
                            toast.success("Intake retry initiated successfully");
                         } catch (err) {
                            toast.error("Failed to retry intake");
                         }
                      }}
                      disabled={retryIntake.isPending}
                      className="bg-[#087f70] hover:bg-[#076b5e] text-white h-10 rounded-[8px] font-semibold text-[13px] px-5"
                   >
                      {retryIntake.isPending ? "Retrying..." : "Retry"}
                   </Button>
                   <Button 
                      variant="outline" 
                      className="text-[#d33d44] border-red-200 hover:bg-red-50 hover:text-red-700 h-10 rounded-[8px] font-semibold text-[13px] px-5"
                      onClick={async () => {
                         try {
                            await cancelIntake.mutateAsync(id);
                            toast.success("Intake cancelled successfully");
                         } catch (err) {
                            toast.error("Failed to cancel intake");
                         }
                      }}
                      disabled={cancelIntake.isPending}
                   >
                      <XCircle className="w-4 h-4 mr-2" /> {cancelIntake.isPending ? "Cancelling..." : "Cancel"}
                   </Button>
                </>
             )}
             {statusVariant === "approved" && (
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
                       <span className="text-[28px] font-bold text-[#087f70]">{formattedAmount}</span>
                    </div>
                    <p className="text-[13px] font-bold text-[#10231d] mb-6">{intake.messageSubject || "No Subject"}</p>
                    
                    <div className="grid grid-cols-3 gap-4 border-t border-black/[0.04] pt-4">
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">INVOICE DATE</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">{invoiceDate}</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">DUE DATE</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">{dueDate}</p>
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
                          <p className="text-[13px] font-semibold text-[#10231d] capitalize">{paymentMethod.replace(/_/g, " ")}</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">BENEFICIARY NAME</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">{beneficiaryName}</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">BENEFICIARY BANK</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">{beneficiaryBank}</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-6">
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">ACCOUNT NUMBER</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">{accountNumber}</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">SORT CODE</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">N/A</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">SUBMITTER</p>
                          <p className="text-[13px] font-semibold text-[#10231d]">{intake.createdBy?.firstName ? `${intake.createdBy.firstName} ${intake.createdBy.lastName}` : "System"}</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Bill Item Breakdown */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <CardHeader className="p-6 border-b border-black/[0.04]">
                    <div className="flex items-center gap-3">
                       <h3 className="text-[15px] font-bold text-[#10231d]">Bill Item Breakdown</h3>
                       <StatusBadge status="provisional" label={lineItems.length.toString()} className="bg-[#f4f7f5] text-[#10231d] border-transparent" />
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
                        {lineItems.length === 0 ? (
                           <TableRow className="border-black/[0.04] hover:bg-transparent">
                             <TableCell colSpan={4} className="text-[13px] text-center text-[#68726d] py-6">No line items provided.</TableCell>
                           </TableRow>
                        ) : (
                          lineItems.map((row: any, i: number) => {
                             const subtotal = (row.quantity || 0) * (row.unitPrice || 0);
                             return (
                               <TableRow key={i} className="border-black/[0.04] hover:bg-[#f9faf9]/50 transition-colors">
                                 <TableCell className="text-[13px] font-semibold text-[#10231d] pl-6 py-4">{row.description || "Item"}</TableCell>
                                 <TableCell className="text-[13px] text-[#68726d] py-4">{row.quantity || 0}</TableCell>
                                 <TableCell className="text-[13px] text-[#68726d] py-4">{row.unitPrice ? `₦${row.unitPrice.toLocaleString()}` : "₦0.00"}</TableCell>
                                 <TableCell className="text-[13px] font-semibold text-[#10231d] py-4 pr-6 text-right">₦{subtotal.toLocaleString()}</TableCell>
                               </TableRow>
                             )
                          })
                        )}
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
                    <h3 className="text-[15px] font-bold text-white">Lifecycle</h3>
                 </div>
                 <div className="p-6">
                    <div className="relative border-l-[2px] border-black/[0.06] ml-3.5 space-y-7 pb-2 mt-2">
                       
                       {/* Received */}
                       <div className="relative pl-7">
                          <div className="absolute -left-[11px] -top-1 bg-white py-1">
                             <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" />
                          </div>
                          <p className="text-[13px] font-bold text-[#10231d]">Received</p>
                          <p className="text-[11px] text-[#84908a] mt-0.5">{format(new Date(intake.receivedAt), "dd-MM-yyyy hh:mm a")}</p>
                       </div>
                       
                       {/* Queued / Validating */}
                       <div className="relative pl-7">
                          <div className="absolute -left-[11px] -top-1 bg-white py-1">
                             {intake.lastQueuedAt ? <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" /> : <div className="w-4 h-4 rounded-full border-[3px] border-black/[0.12] flex items-center justify-center bg-white shadow-sm ml-0.5 mt-0.5" />}
                          </div>
                          <p className={`text-[13px] ${intake.lastQueuedAt ? "font-bold text-[#10231d]" : "font-medium text-[#84908a]"}`}>Queued</p>
                          {intake.lastQueuedAt && <p className="text-[11px] text-[#84908a] mt-0.5">{format(new Date(intake.lastQueuedAt), "dd-MM-yyyy hh:mm a")}</p>}
                       </div>

                       {/* Processed */}
                       <div className="relative pl-7">
                          <div className="absolute -left-[11px] -top-1 bg-white py-1">
                             {intake.processedAt ? <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" /> : <div className="w-4 h-4 rounded-full border-[3px] border-black/[0.12] flex items-center justify-center bg-white shadow-sm ml-0.5 mt-0.5" />}
                          </div>
                          <p className={`text-[13px] ${intake.processedAt ? "font-bold text-[#10231d]" : "font-medium text-[#84908a]"}`}>Processed</p>
                          {intake.processedAt && <p className="text-[11px] text-[#84908a] mt-0.5">{format(new Date(intake.processedAt), "dd-MM-yyyy hh:mm a")}</p>}
                       </div>

                       {/* Failure/Cancelled State if applicable */}
                       {(intake.failureMessage || intake.cancelledAt) && (
                         <div className="relative pl-7">
                            <div className="absolute -left-[11px] -top-1 bg-white py-1">
                               <XCircle className="w-5 h-5 text-red-500 fill-red-50" />
                            </div>
                            <p className="text-[13px] font-bold text-red-600">{intake.cancelledAt ? "Cancelled" : "Failed"}</p>
                            {intake.failureMessage && <p className="text-[11px] text-red-500 mt-0.5 max-w-[180px] break-words">{intake.failureMessage}</p>}
                            {intake.cancelledAt && <p className="text-[11px] text-[#84908a] mt-0.5">{format(new Date(intake.cancelledAt), "dd-MM-yyyy hh:mm a")}</p>}
                         </div>
                       )}

                    </div>
                 </div>
              </div>

              {/* Documents */}
              <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
                 <div className="px-6 py-5 border-b border-black/[0.04]">
                    <h3 className="text-[15px] font-bold text-[#10231d]">Documents ({intake.documents?.length || 0})</h3>
                 </div>
                 <CardContent className="p-6">
                    {!intake.documents || intake.documents.length === 0 ? (
                       <p className="text-[13px] text-[#68726d]">No documents attached.</p>
                    ) : (
                       <div className="space-y-3">
                          {intake.documents.map((doc: any, i: number) => (
                             <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <div className="p-2 bg-red-50 border border-red-100 rounded-[8px]">
                                      <FileText className="w-4 h-4 text-red-500" />
                                   </div>
                                   <span className="text-[13px] font-medium text-[#10231d] truncate max-w-[120px]">{doc.fileName || `Document ${i+1}`}</span>
                                </div>
                                <Button variant="link" className="text-[#087f70] font-semibold text-[12px] h-auto p-0 hover:text-[#076b5e]">Download</Button>
                             </div>
                          ))}
                       </div>
                    )}
                 </CardContent>
              </Card>

           </div>
        </div>
      </div>
    </div>
  );
}

export default withPermissions(InvoiceDetailsPage, [
  { resource: "bill_pay.invoice", action: "view" },
  { resource: "bill_pay.intake", action: "view" },
]);
