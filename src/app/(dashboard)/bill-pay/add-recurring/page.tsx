"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";

import { useEffect } from "react";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";

function formatNumberInput(value: string) {
  let numeric = value.replace(/[^0-9.]/g, '');
  const parts = numeric.split('.');
  if (parts.length > 2) numeric = parts[0] + '.' + parts.slice(1).join('');
  if (!numeric) return '';
  const [int, dec] = numeric.split('.');
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${formattedInt}.${dec}` : formattedInt;
}

export default function AddRecurringBillPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  
  // Step 2 State
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [frequency, setFrequency] = useState("monthly");
  const [amountType, setAmountType] = useState("variable");
  const [amountTolerance, setAmountTolerance] = useState("10");
  const [autoApproval, setAutoApproval] = useState(true);
  const [endDateType, setEndDateType] = useState("never");
  const [endDate, setEndDate] = useState<Date>();
  
  // Attachments
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachment(e.dataTransfer.files[0]);
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachment(e.target.files[0]);
    }
  };

  useEffect(() => {
    setBackHandler(() => {
      if (step > 1) {
        setStep((s) => s - 1);
      } else {
        router.push("/bill-pay");
      }
    });
    return () => clearBackHandler();
  }, [step, setBackHandler, clearBackHandler, router]);

  return (
    <div className="flex-1 flex flex-col pb-8">
      {/* Stepper */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-10 bg-[#f4f7f5] pb-4 mb-6 border-b border-transparent -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6 -mt-3 sm:-mt-5 lg:-mt-6 pt-5 sm:pt-7 lg:pt-8">
        <div className="w-full max-w-3xl mx-auto flex items-center gap-3 text-sm px-1">
          <div className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 1 ? 'bg-[#087f70] text-white' : 'bg-black/[0.06] text-[#68726d]'}`}>1</div>
            <span className={step === 1 ? 'text-[#0b100e] font-medium' : 'text-[#68726d]'}>Billing Information</span>
          </div>
          <div className="h-px w-8 bg-black/[0.06]" />
          <div className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 2 ? 'bg-[#087f70] text-white' : 'bg-black/[0.06] text-[#68726d]'}`}>2</div>
            <span className={step === 2 ? 'text-[#0b100e] font-medium' : 'text-[#68726d]'}>Configuration</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl mx-auto px-1">
        <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
          <CardContent className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-[18px] font-bold text-[#10231d]">Billing Information</h2>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#10231d]">Vendor Name</label>
                    <Input 
                      placeholder="e.g. Acme Corp" 
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#10231d]">Description</label>
                    <Input 
                      placeholder="e.g. AWS Cloud Services - Monthly" 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-[#10231d]">Expected Amount</label>
                      <div className="flex items-center border border-black/[0.08] rounded-[8px] h-10 overflow-hidden focus-within:ring-1 focus-within:ring-[#087f70]">
                        <div className="bg-[#f9faf9] text-[#68726d] px-3 h-full flex items-center border-r border-black/[0.06] text-[13px]">
                          NGN
                        </div>
                        <input 
                          type="text" 
                          placeholder="0.00" 
                          value={expectedAmount}
                          onChange={(e) => setExpectedAmount(formatNumberInput(e.target.value))}
                          className="flex-1 h-full px-3 outline-none text-[13px]" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-[#10231d]">Start Date</label>
                      <DatePicker 
                        date={startDate} 
                        setDate={setStartDate} 
                        className="rounded-[8px] border-black/[0.08] text-[13px]" 
                        fromDate={new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="attachment-upload" className="text-[13px] font-medium text-[#10231d] cursor-pointer hover:text-[#087f70] transition-colors">Attachment (Optional)</label>
                    <p className="text-[12px] text-[#68726d] mb-2">You can attach contract or other documents</p>
                    
                    <input 
                      type="file" 
                      id="attachment-upload" 
                      className="hidden" 
                      accept=".pdf,image/jpeg,image/png" 
                      onChange={handleFileSelect} 
                    />
                    
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("attachment-upload")?.click()}
                      className={`border border-dashed rounded-[10px] p-6 flex items-center justify-between transition-colors cursor-pointer ${
                        isDragging ? "border-[#087f70] bg-[#f0faf8]" : "border-black/[0.12] bg-[#f9faf9] hover:bg-[#f5f7f6]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white rounded-[8px] flex items-center justify-center border border-black/[0.08] text-[#84908a] shadow-sm">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        </div>
                        <div>
                          {attachment ? (
                            <>
                              <p className="text-[13px] font-medium text-[#10231d] truncate max-w-[200px] sm:max-w-[300px]">{attachment.name}</p>
                              <p className="text-[12px] text-[#68726d]">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                            </>
                          ) : (
                            <>
                              <p className="text-[13px] font-medium text-[#10231d]">Upload or drag and drop files</p>
                              <p className="text-[12px] text-[#68726d]">PDF, JPG or PNG (max. 10MB)</p>
                            </>
                          )}
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById("attachment-upload")?.click();
                        }}
                        className="text-[#087f70] border-[#087f70]/30 h-8 text-xs font-medium bg-white hover:bg-[#f0faf8] hover:text-[#076b5e]"
                      >
                        {attachment ? "Replace" : "Upload"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-black/[0.06]">
                  <Button variant="outline" className="w-32 h-10 text-[#52605b] border-black/[0.08] rounded-[8px] font-semibold text-[13px] hover:bg-[#f9faf9]" onClick={() => router.push("/bill-pay")}>Cancel</Button>
                  <Button 
                    className="w-32 h-10 bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] font-semibold text-[13px]" 
                    onClick={() => setStep(2)}
                    disabled={!vendorName.trim() || !description.trim() || !expectedAmount.trim() || !startDate}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-[18px] font-bold text-[#10231d]">Configuration</h2>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#10231d]">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-10 rounded-[8px] border-black/[0.08] text-[13px]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-[#10231d]">Frequency</label>
                      <Select value={frequency} onValueChange={setFrequency}>
                        <SelectTrigger className="h-10 rounded-[8px] border-black/[0.08] text-[13px]">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="text-[13px] font-medium text-[#10231d]">End Date</label>
                      <div className="flex gap-2">
                        <Select value={endDateType} onValueChange={setEndDateType}>
                          <SelectTrigger className="h-10 rounded-[8px] border-black/[0.08] text-[13px] flex-1">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never</SelectItem>
                            <SelectItem value="specific">Specific date</SelectItem>
                          </SelectContent>
                        </Select>
                        {endDateType === "specific" && (
                          <div className="flex-1">
                            <DatePicker 
                              date={endDate} 
                              setDate={setEndDate} 
                              className="rounded-[8px] border-black/[0.08] text-[13px]" 
                              placeholder="End Date"
                              fromDate={startDate ?? new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[13px] font-medium text-[#10231d] mb-2 block">Amount Type</label>
                    <RadioGroup value={amountType} onValueChange={setAmountType} className="flex gap-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id="r1" className="text-[#087f70] border-[#087f70]" />
                        <label htmlFor="r1" className="text-[13px] text-[#10231d] cursor-pointer">Fixed</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="variable" id="r2" className="text-[#087f70] border-[#087f70]" />
                        <label htmlFor="r2" className="text-[13px] text-[#10231d] cursor-pointer">Variable</label>
                      </div>
                    </RadioGroup>
                  </div>

                  {amountType === "variable" && (
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-[#10231d]">Amount Tolerance</label>
                      <Select value={amountTolerance} onValueChange={setAmountTolerance}>
                        <SelectTrigger className="h-10 rounded-[8px] border-black/[0.08] text-[13px]">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">±5%</SelectItem>
                          <SelectItem value="10">±10%</SelectItem>
                          <SelectItem value="15">±15%</SelectItem>
                          <SelectItem value="20">±20%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className={`mt-6 rounded-[10px] p-4 flex items-start gap-3 transition-colors ${autoApproval ? 'bg-[#f0faf8] border border-[#087f70]/30' : 'bg-[#f9faf9] border border-black/[0.06]'}`}>
                    <Checkbox 
                      checked={autoApproval} 
                      onCheckedChange={(checked) => setAutoApproval(checked as boolean)}
                      className="mt-1 data-[state=checked]:bg-[#087f70] data-[state=checked]:border-[#087f70] border-black/[0.2]"
                    />
                    <div>
                      <p className="text-[13px] font-medium text-[#10231d]">Enable Auto-Approval</p>
                      <p className="text-[12px] text-[#68726d] mt-1">Automatically approve bills that match this rule's criteria.</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-black/[0.06]">
                  <Button variant="outline" className="w-32 h-10 text-[#52605b] border-black/[0.08] rounded-[8px] font-semibold text-[13px] hover:bg-[#f9faf9]" onClick={() => setStep(1)}>Cancel</Button>
                  <Button 
                    className="w-48 h-10 bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] font-semibold text-[13px]" 
                    onClick={() => router.push('/bill-pay')}
                    disabled={endDateType === "specific" && !endDate}
                  >
                    Submit for Approval
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
