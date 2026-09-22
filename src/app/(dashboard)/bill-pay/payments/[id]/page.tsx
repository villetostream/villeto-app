"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { 
  useGetPaymentRequestById, 
  useSubmitPaymentRequest,
  useAuthorizePaymentRequest,
  useRejectPaymentRequest,
  useSchedulePaymentRequest,
  useInitiatePaymentRequest,
  useRecordExternalPayment,
  useGetFundingAccounts,
} from "@/queries/bill-pay";
import { useLegalEntities } from "@/queries/legal-entities";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

function PaymentSetupPage() {
  const router = useRouter();
  const params = useParams();
  const paymentRequestId = (params?.id as string);
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();
  const policies = useAuthorizationPolicies();

  const { data: requestData, isLoading } = useGetPaymentRequestById(paymentRequestId);
  const payment = requestData?.data;

  const { data: legalEntitiesData } = useLegalEntities();
  const legalEntityId = legalEntitiesData?.data?.[0]?.legalEntityId || "a3c0738f-a024-497a-9cbf-a488dba29bf4";

  const { data: fundingData } = useGetFundingAccounts(legalEntityId);
  const fundingAccounts = (fundingData as any)?.data || [];

  useEffect(() => {
    setBackHandler(() => router.back());
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router]);

  const status = payment?.status || "draft";
  const isReadonly = !["draft", "rejected"].includes(status) || !policies.billPay.canPreparePayment;

  // Form state for Draft/Editing
  const [fundingAccount, setFundingAccount] = useState<string>(payment?.fundingAccountId || "");
  const [paymentAmountType, setPaymentAmountType] = useState("full");
  const [whenToPay, setWhenToPay] = useState("immediately");
  const [scheduleDate, setScheduleDate] = useState<Date>();

  useEffect(() => {
    if (payment?.fundingAccountId && !fundingAccount) {
      setFundingAccount(payment.fundingAccountId);
    }
  }, [payment?.fundingAccountId]);

  // Modals state
  const [actionModal, setActionModal] = useState<"authorize" | "reject" | "record-external" | null>(null);
  const [reason, setReason] = useState("");
  const [externalRef, setExternalRef] = useState("");

  const submitMutation = useSubmitPaymentRequest();
  const authorizeMutation = useAuthorizePaymentRequest();
  const rejectMutation = useRejectPaymentRequest();
  const scheduleMutation = useSchedulePaymentRequest();
  const initiateMutation = useInitiatePaymentRequest();
  const recordExternalMutation = useRecordExternalPayment();

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync(paymentRequestId);
      toast.success("Payment request submitted for authorization");
    } catch (e) {
      toast.error("Failed to submit payment request");
    }
  };

  const handleAuthorize = async () => {
    try {
      await authorizeMutation.mutateAsync({ id: paymentRequestId, payload: { reason } });
      toast.success("Payment authorized successfully");
      setActionModal(null);
      setReason("");
    } catch (e) {
      toast.error("Failed to authorize payment");
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({ id: paymentRequestId, payload: { reason } });
      toast.success("Payment rejected successfully");
      setActionModal(null);
      setReason("");
    } catch (e) {
      toast.error("Failed to reject payment");
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate) return toast.error("Please select a date");
    try {
      await scheduleMutation.mutateAsync({ 
        id: paymentRequestId, 
        payload: { executionDate: format(scheduleDate, "yyyy-MM-dd") } 
      });
      toast.success("Payment scheduled successfully");
    } catch (e) {
      toast.error("Failed to schedule payment");
    }
  };

  const handleInitiate = async () => {
    try {
      await initiateMutation.mutateAsync(paymentRequestId);
      toast.success("Payment initiated successfully");
    } catch (e) {
      toast.error("Failed to initiate payment");
    }
  };

  const handleRecordExternal = async () => {
    if (!externalRef) return toast.error("Please provide a bank reference");
    if (!payment?.fundingAccountId) return toast.error("Funding account is missing");
    
    try {
      await recordExternalMutation.mutateAsync({ 
        id: paymentRequestId, 
        payload: { 
          fundingAccountId: payment.fundingAccountId,
          beneficiaryId: payment.vendorBeneficiary?.vendorBeneficiaryId || "",
          executionDate: format(new Date(), "yyyy-MM-dd"),
          amount: payment.amount,
          bankReference: externalRef,
          idempotencyKey: Math.random().toString(36).substring(7),
        } 
      });
      toast.success("External payment recorded successfully");
      setActionModal(null);
      setExternalRef("");
    } catch (e) {
      toast.error("Failed to record external payment");
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading payment details...</div>;
  if (!payment) return <div className="p-8 text-center text-red-500">Payment request not found</div>;

  return (
    <div className="flex-1 pb-8 flex flex-col relative">
      
      {/* Header Section (Sticky) */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-10 bg-[#f4f7f5] pb-4 mb-8 px-6 lg:px-8 pt-5 sm:pt-7 lg:pt-8 -mt-3 sm:-mt-5 lg:-mt-6">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[24px] font-bold text-[#10231d] uppercase">{paymentRequestId.split('-')[0]}</h1>
              <StatusBadge 
                status={status === "awaiting_authorization" ? "awaiting_authorization" : (["authorized", "completed", "scheduled"].includes(status) ? "approved" : status === "rejected" ? "rejected" : "default")} 
                label={status.replace(/_/g, ' ')}
                className="capitalize"
              />
            </div>
            <p className="text-[13px] text-[#68726d]">{payment.createdAt ? format(new Date(payment.createdAt), "dd-MM-yyyy") : "N/A"}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {status === "draft" && policies.billPay.canPreparePayment && (
              <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-10 px-5 font-semibold text-[13px]">
                Submit for Authorization
              </Button>
            )}
            
            {status === "submitted" && policies.billPay.canAuthorizePayment && (
              <>
                <Button variant="outline" onClick={() => setActionModal("reject")} className="text-red-600 border-red-200 hover:bg-red-50 rounded-[8px] h-10 px-5 font-semibold text-[13px]">
                  Reject
                </Button>
                <Button onClick={() => setActionModal("authorize")} className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-10 px-5 font-semibold text-[13px]">
                  Authorize
                </Button>
              </>
            )}

            {status === "authorized" && (
              <>
                {policies.billPay.canRecordExternalPayment && (
                  <Button variant="outline" onClick={() => setActionModal("record-external")} className="border-black/[0.08] text-[#10231d] rounded-[8px] h-10 px-5 font-semibold text-[13px]">
                    Record External
                  </Button>
                )}
                {policies.billPay.canInitiatePayment && (
                  <Button onClick={handleInitiate} disabled={initiateMutation.isPending} className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-10 px-5 font-semibold text-[13px]">
                    Initiate Payment
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 max-w-[1200px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Main Content Area (Left) */}
          <div className="flex-1 space-y-6 min-w-0 w-full">

            {/* Success Banner for Paid */}
            {status === "completed" && (
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[12px] p-5 space-y-4">
                <div className="flex items-center gap-2 text-[#166534] font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  Payment successfully completed
                </div>
                <p className="text-sm text-[#15803d]">Amount Paid: ₦{parseFloat(payment.amount).toLocaleString()}</p>
              </div>
            )}

            {/* Payment Setup Card */}
            <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
              <CardContent className="p-6">
              <h3 className="text-[15px] font-bold text-[#10231d] mb-4">Payment Setup</h3>
              
              {!isReadonly ? (
                <div className="space-y-6">
                  <div>
                    <Label className="text-[13px] font-semibold text-[#10231d] mb-2 block">Funding Account</Label>
                    <Select value={fundingAccount} onValueChange={setFundingAccount}>
                      <SelectTrigger className="w-full h-11 border-black/[0.08] rounded-[8px] focus:ring-[#087f70]">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {fundingAccounts.map((account: any) => (
                          <SelectItem key={account.fundingAccountId} value={account.fundingAccountId}>
                            {account.name} (***{account.maskedIdentifier?.slice(-4)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[13px] font-semibold text-[#10231d] block">Payment Amount</Label>
                      <RadioGroup value={paymentAmountType} onValueChange={setPaymentAmountType} className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="full" id="r-full" className="text-[#087f70] border-black/[0.12]" />
                          <Label htmlFor="r-full" className="text-[13px] font-medium text-[#68726d]">Pay full amount</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[13px] font-semibold text-[#10231d] block">When to Pay</Label>
                      <RadioGroup value={whenToPay} onValueChange={setWhenToPay} className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="immediately" id="r-now" className="text-[#087f70] border-black/[0.12]" />
                          <Label htmlFor="r-now" className="text-[13px] font-medium text-[#68726d]">Pay immediately</Label>
                        </div>
                        {policies.billPay.canSchedulePayment && (
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="schedule" id="r-schedule" className="text-[#087f70] border-black/[0.12]" />
                            <Label htmlFor="r-schedule" className="text-[13px] font-medium text-[#68726d]">Schedule payment</Label>
                          </div>
                        )}
                      </RadioGroup>
                      {whenToPay === "schedule" && (
                        <div className="relative mt-2 max-w-xs flex gap-2">
                          <DatePicker
                            date={scheduleDate}
                            setDate={setScheduleDate}
                            fromDate={new Date()}
                            placeholder="Select schedule date"
                          />
                          <Button onClick={handleSchedule} disabled={scheduleMutation.isPending} className="bg-[#087f70] text-white">Save</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6">
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">FUNDING ACCOUNT</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">
                      {fundingAccounts.find((a: any) => a.fundingAccountId === payment.fundingAccountId)?.name || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">PAYMENT AMOUNT</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">Pay full amount</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">EXECUTION DATE</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">{payment.requestedExecutionDate ? format(new Date(payment.requestedExecutionDate), "PPP") : "Immediate"}</p>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Amount Summary Card */}
            <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
              <CardContent className="p-6">
                <div>
                  <h1 className="text-[32px] font-bold text-[#087f70] leading-none mb-2">₦{parseFloat(payment.amount || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}</h1>
                  <p className="text-[14px] font-bold text-[#10231d]">Payment Amount</p>
                </div>
                <div className="grid grid-cols-3 gap-4 border-t border-black/[0.04] pt-6 mt-6">
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">ALLOCATIONS</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">{payment.allocations?.length || 0} Invoice(s)</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">CURRENCY</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">{payment.currency}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Recipient Card */}
            {policies.billPay.canViewSensitivePayment && (
            <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
              <CardContent className="p-6">
                <h3 className="text-[15px] font-bold text-[#10231d] mb-4">Payment Recipient</h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">BENEFICIARY NAME</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">{payment.vendorBeneficiary?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">VENDOR</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">{payment.vendor?.legalName || payment.vendor?.displayName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">ACCOUNT NUMBER</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">{payment.vendorBeneficiary?.maskedIdentifier || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
          </div>

          {/* Right Sidebar Area */}
          <div className="w-full lg:w-[360px] space-y-4 shrink-0">
            
            {/* Vendor Card */}
            <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
              <CardContent className="p-5">
                <h3 className="text-[15px] font-bold text-[#10231d] mb-4">Vendor</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold">
                      <span className="text-lg">V</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#10231d]">{payment.vendor?.legalName || payment.vendor?.displayName || "N/A"}</p>
                    </div>
                  </div>
                  <div className="mt-1">
                    <StatusBadge status="verified" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Progress */}
            <div className="bg-white rounded-[14px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col">
              <div className="bg-[#1C2B36] rounded-t-[14px] px-6 py-4">
                <h3 className="text-base font-bold text-white">Workflow Progress</h3>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="relative border-l-[2px] border-black/[0.06] ml-3.5 space-y-7 pb-2 mt-2">
                  
                  {/* Step 1: Draft */}
                  <div className="relative pl-7">
                    {status === "draft" ? (
                      <div className="absolute -left-[9px] top-0.5 bg-white py-1">
                        <div className="w-4 h-4 rounded-full border-[3px] border-[#087f70] flex items-center justify-center bg-white shadow-sm"></div>
                      </div>
                    ) : (
                      <div className="absolute -left-[11px] -top-1 bg-white py-1">
                        <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" />
                      </div>
                    )}
                    <p className={`text-[13px] ${status === "draft" ? "font-bold text-[#10231d]" : "font-medium text-[#10231d]"}`}>Draft</p>
                  </div>
                  
                  {/* Step 2: Awaiting Authorization */}
                  <div className="relative pl-7">
                    {status === "draft" ? (
                      <div className="absolute -left-1.5 top-1 bg-white py-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-black/[0.12]"></div>
                      </div>
                    ) : status === "submitted" ? (
                      <div className="absolute -left-[9px] top-0.5 bg-white py-1">
                        <div className="w-4 h-4 rounded-full border-[3px] border-[#087f70] flex items-center justify-center bg-white shadow-sm"></div>
                      </div>
                    ) : (
                      <div className="absolute -left-[11px] -top-1 bg-white py-1">
                        <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" />
                      </div>
                    )}
                    <p className={`text-[13px] ${status === "draft" ? "font-medium text-[#84908a]" : status === "submitted" ? "font-bold text-[#10231d]" : "font-medium text-[#10231d]"}`}>Awaiting Authorization</p>
                  </div>

                  {/* Step 3: Paid */}
                  <div className="relative pl-7">
                    {["completed", "reconciled", "externally_recorded"].includes(status) ? (
                      <div className="absolute -left-[11px] -top-1 bg-white py-1">
                        <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" />
                      </div>
                    ) : (
                      <div className="absolute -left-1.5 top-1 bg-white py-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-black/[0.12]"></div>
                      </div>
                    )}
                    <p className={`text-[13px] ${["completed", "reconciled", "externally_recorded"].includes(status) ? "font-bold text-[#10231d]" : "font-medium text-[#84908a]"}`}>Paid / Recorded</p>
                  </div>

                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Modals */}
      <Dialog open={actionModal !== null} onOpenChange={(val) => !val && setActionModal(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[16px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#10231d]">
              {actionModal === "authorize" && "Authorize Payment"}
              {actionModal === "reject" && "Reject Payment"}
              {actionModal === "record-external" && "Record External Payment"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#68726d]">
              {actionModal === "authorize" && "Are you sure you want to authorize this payment request?"}
              {actionModal === "reject" && "Please provide a reason for rejecting this payment."}
              {actionModal === "record-external" && "Record a payment made outside the platform (e.g. manual bank transfer)."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {(actionModal === "authorize" || actionModal === "reject") && (
              <div className="space-y-2">
                <Label>Reason (Optional for authorization)</Label>
                <Input 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="Enter reason..."
                  className="rounded-[8px]"
                />
              </div>
            )}
            {actionModal === "record-external" && (
              <div className="space-y-2">
                <Label>Bank Reference / Trace ID</Label>
                <Input 
                  value={externalRef} 
                  onChange={(e) => setExternalRef(e.target.value)} 
                  placeholder="Enter reference ID"
                  className="rounded-[8px]"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)} className="rounded-[8px]">Cancel</Button>
            {actionModal === "authorize" && <Button onClick={handleAuthorize} disabled={authorizeMutation.isPending} className="bg-[#087f70] text-white rounded-[8px]">Confirm Authorization</Button>}
            {actionModal === "reject" && <Button onClick={handleReject} disabled={rejectMutation.isPending || !reason} className="bg-red-600 text-white hover:bg-red-700 rounded-[8px]">Reject Request</Button>}
            {actionModal === "record-external" && <Button onClick={handleRecordExternal} disabled={recordExternalMutation.isPending || !externalRef} className="bg-[#087f70] text-white rounded-[8px]">Record Payment</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withPermissions(PaymentSetupPage, [
  { resource: "bill_pay.payment_request", action: "view" },
  { resource: "bill_pay.payment", action: "view" },
]);
