"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Download, CheckCircle2, CloudLightning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

type PaymentStatus = "Draft" | "Awaiting Authorization" | "Paid";

export default function PaymentSetupPage() {
  const router = useRouter();
  const params = useParams();
  const paymentId = (params?.id as string) || "INV-2024";
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  useEffect(() => {
    setBackHandler(() => router.back());
    return () => clearBackHandler();
  }, [setBackHandler, clearBackHandler, router]);

  // Dev-only toggle for the UI designer
  const [status, setStatus] = useState<PaymentStatus>("Draft");

  // Form state
  const [fundingAccount, setFundingAccount] = useState("villeto");
  const [paymentAmountType, setPaymentAmountType] = useState("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [whenToPay, setWhenToPay] = useState("immediately");
  const [scheduleDate, setScheduleDate] = useState<Date>();

  const getStatusBadge = () => {
    switch (status) {
      case "Draft":
        return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 font-normal">Draft</Badge>;
      case "Awaiting Authorization":
        return <Badge variant="outline" className="bg-[#fffbeb] text-[#f59e0b] border-[#fef3c7] hover:bg-[#fffbeb] font-normal">Awaiting Authorization</Badge>;
      case "Paid":
        return <Badge variant="outline" className="bg-[#ecfdf5] text-[#10b981] border-[#d1fae5] hover:bg-[#ecfdf5] font-normal">Paid</Badge>;
    }
  };

  const isReadonly = status === "Awaiting Authorization" || status === "Paid";

  return (
    <div className="flex-1 pb-8 flex flex-col relative">
      
      {/* Dev-only Toggler - Floating at bottom right */}
      <div className="fixed bottom-6 right-6 bg-white p-4 rounded-xl shadow-2xl border border-black/[0.08] z-50 flex flex-col gap-2 w-64">
        <p className="text-xs font-bold text-[#68726d] uppercase mb-1 flex items-center gap-1">
          <CloudLightning className="w-3 h-3 text-amber-500" /> Dev Toggler
        </p>
        <RadioGroup value={status} onValueChange={(val) => setStatus(val as PaymentStatus)} className="flex flex-col gap-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Draft" id="dev-draft" />
            <Label htmlFor="dev-draft">Draft</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Awaiting Authorization" id="dev-await" />
            <Label htmlFor="dev-await">Awaiting Authorization</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Paid" id="dev-paid" />
            <Label htmlFor="dev-paid">Paid</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Header Section (Sticky) */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-10 bg-[#f4f7f5] pb-4 mb-8 px-6 lg:px-8 pt-5 sm:pt-7 lg:pt-8 -mt-3 sm:-mt-5 lg:-mt-6">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[24px] font-bold text-[#10231d]">{paymentId}</h1>
              {getStatusBadge()}
            </div>
            <p className="text-[13px] text-[#68726d]">09-10-2025</p>
          </div>
          
          <div className="flex items-center gap-3">
            {status === "Draft" && (
              <Button className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-10 px-5 font-semibold text-[13px]">
                Submit for Authorization
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 max-w-[1200px] mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Main Content Area (Left) */}
          <div className="flex-1 space-y-6 min-w-0 w-full">

            {/* Success Banner for Paid */}
            {status === "Paid" && (
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[12px] p-5 space-y-4">
                <div className="flex items-center gap-2 text-[#166534] font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  Payment successfully completed
                </div>
                <p className="text-sm text-[#15803d]">Completed: Aug 14, 2025 at 11:42 AM • Amount Paid: ₦500,000.00</p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-[11px] font-semibold text-[#15803d] uppercase tracking-wider mb-1">PAYMENT REFERENCE</p>
                    <p className="text-sm font-bold text-[#14532d]">PAY-2025-08-0039</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#15803d] uppercase tracking-wider mb-1">PROVIDER REFERENCE</p>
                    <p className="text-sm font-bold text-[#14532d]">FBN-TXN-20250814-7834</p>
                  </div>
                </div>
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
                        <SelectItem value="villeto">Villeto Bank Account</SelectItem>
                        <SelectItem value="zenith">Zenith Bank Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-[#68726d] mt-2">Balance: <span className="font-bold text-[#10231d]">₦150,674.00</span></p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[13px] font-semibold text-[#10231d] block">Payment Amount</Label>
                      <RadioGroup value={paymentAmountType} onValueChange={setPaymentAmountType} className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="full" id="r-full" className="text-[#087f70] border-black/[0.12]" />
                          <Label htmlFor="r-full" className="text-[13px] font-medium text-[#68726d]">Pay full amount</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="partial" id="r-partial" className="text-[#087f70] border-black/[0.12]" />
                          <Label htmlFor="r-partial" className="text-[13px] font-medium text-[#68726d]">Pay partial amount</Label>
                        </div>
                      </RadioGroup>
                      {paymentAmountType === "partial" && (
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#68726d] font-semibold">NGN</span>
                          <Input 
                            value={partialAmount}
                            onChange={(e) => setPartialAmount(e.target.value)}
                            placeholder="0.00"
                            className="pl-12 h-11 border-black/[0.08] rounded-[8px] focus-visible:ring-[#087f70]"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[13px] font-semibold text-[#10231d] block">When to Pay</Label>
                      <RadioGroup value={whenToPay} onValueChange={setWhenToPay} className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="immediately" id="r-now" className="text-[#087f70] border-black/[0.12]" />
                          <Label htmlFor="r-now" className="text-[13px] font-medium text-[#68726d]">Pay immediately</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="schedule" id="r-schedule" className="text-[#087f70] border-black/[0.12]" />
                          <Label htmlFor="r-schedule" className="text-[13px] font-medium text-[#68726d]">Schedule payment</Label>
                        </div>
                      </RadioGroup>
                      {whenToPay === "schedule" && (
                        <div className="relative mt-2 max-w-xs">
                          <DatePicker
                            date={scheduleDate}
                            setDate={setScheduleDate}
                            fromDate={new Date()}
                            placeholder="Select schedule date"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6">
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">FUNDING ACCOUNT</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">Villeto Bank Account</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">PAYMENT AMOUNT</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">{paymentAmountType === "full" ? "Pay full amount" : `Pay partial amount (₦${partialAmount || "0.00"})`}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">WHEN TO PAY</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">{whenToPay === "immediately" ? "Pay immediately" : `Schedule payment (${scheduleDate ? format(scheduleDate, "PPP") : "TBD"})`}</p>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Amount Summary Card */}
            <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
              <CardContent className="p-6">
                <div>
                  <h1 className="text-[32px] font-bold text-[#087f70] leading-none mb-2">₦500,000</h1>
                  <p className="text-[14px] font-bold text-[#10231d]">Office supplies</p>
                </div>
                <div className="grid grid-cols-3 gap-4 border-t border-black/[0.04] pt-6 mt-6">
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

            {/* Payment Recipient Card */}
            <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
              <CardContent className="p-6">
                <h3 className="text-[15px] font-bold text-[#10231d] mb-4">Payment Recipient</h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
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
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">ACCOUNT NUMBER</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">{status === "Paid" || status === "Awaiting Authorization" ? "********53523" : "123-43535-53523"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-wider mb-1">SORT CODE</p>
                    <p className="text-[13px] font-semibold text-[#10231d]">057-434244</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      <span className="text-lg">☁️</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#10231d]">Acme Ltd</p>
                      <p className="text-[11px] text-[#68726d]">VND-0089</p>
                    </div>
                  </div>
                  <div className="mt-1">
                    <Badge variant="outline" className="bg-[#ecfdf5] text-[#10b981] border-[#d1fae5] font-normal text-[10px] px-2 h-5">Verified</Badge>
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
                    {status === "Draft" ? (
                      <div className="absolute -left-[9px] top-0.5 bg-white py-1">
                        <div className="w-4 h-4 rounded-full border-[3px] border-[#087f70] flex items-center justify-center bg-white shadow-sm"></div>
                      </div>
                    ) : (
                      <div className="absolute -left-[11px] -top-1 bg-white py-1">
                        <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" />
                      </div>
                    )}
                    <p className={`text-[13px] ${status === "Draft" ? "font-bold text-[#10231d]" : "font-medium text-[#10231d]"}`}>Draft</p>
                    <p className="text-[11px] text-[#84908a] mt-0.5">09-10-2025 07:07 PM</p>
                  </div>
                  
                  {/* Step 2: Awaiting Authorization */}
                  <div className="relative pl-7">
                    {status === "Draft" ? (
                      <div className="absolute -left-1.5 top-1 bg-white py-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-black/[0.12]"></div>
                      </div>
                    ) : status === "Awaiting Authorization" ? (
                      <div className="absolute -left-[9px] top-0.5 bg-white py-1">
                        <div className="w-4 h-4 rounded-full border-[3px] border-[#087f70] flex items-center justify-center bg-white shadow-sm"></div>
                      </div>
                    ) : (
                      <div className="absolute -left-[11px] -top-1 bg-white py-1">
                        <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" />
                      </div>
                    )}
                    <p className={`text-[13px] ${status === "Draft" ? "font-medium text-[#84908a]" : status === "Awaiting Authorization" ? "font-bold text-[#10231d]" : "font-medium text-[#10231d]"}`}>Awaiting Authorization</p>
                    {status !== "Draft" && <p className="text-[11px] text-[#84908a] mt-0.5">09-10-2025 07:45 PM</p>}
                  </div>

                  {/* Step 3: Paid */}
                  <div className="relative pl-7">
                    {status === "Paid" ? (
                      <div className="absolute -left-[11px] -top-1 bg-white py-1">
                        <CheckCircle2 className="w-5 h-5 text-[#087f70] fill-[#f0faf8]" />
                      </div>
                    ) : (
                      <div className="absolute -left-1.5 top-1 bg-white py-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-black/[0.12]"></div>
                      </div>
                    )}
                    <p className={`text-[13px] ${status === "Paid" ? "font-bold text-[#10231d]" : "font-medium text-[#84908a]"}`}>Paid</p>
                    {status === "Paid" && <p className="text-[11px] text-[#84908a] mt-0.5">10-10-2025 09:12 AM</p>}
                  </div>

                </div>
              </div>
            </div>

            {/* Documents Card */}
            <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-[15px] font-bold text-[#10231d]">Documents</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center">
                      <span className="text-red-500 font-bold text-[10px]">PDF</span>
                    </div>
                    <span className="text-[12px] font-medium text-[#10231d]">Invoice.pdf</span>
                  </div>
                  <button className="text-[#087f70] hover:text-[#076b5e] text-[11px] font-bold transition-colors">
                    Download
                  </button>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </div>
  );
}
