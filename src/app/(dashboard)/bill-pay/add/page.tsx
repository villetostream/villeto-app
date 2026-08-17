"use client";

import { useState, useEffect } from "react";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import { useRouter } from "next/navigation";
import { ArrowLeft, ScanLine, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import BillLineItemBatchModal from "@/components/bill-pay/BillLineItemBatchModal";

export default function AddBillPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>();
  const [dueDate, setDueDate] = useState<Date>();
  
  // Step 2 State
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [isLineItemModalOpen, setIsLineItemModalOpen] = useState(false);
  
  // Step 3 State
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryBank, setBeneficiaryBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  
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
            <span className={step === 2 ? 'text-[#0b100e] font-medium' : 'text-[#68726d]'}>Line Items</span>
          </div>
          <div className="h-px w-8 bg-black/[0.06]" />
          <div className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 3 ? 'bg-[#087f70] text-white' : 'bg-black/[0.06] text-[#68726d]'}`}>3</div>
            <span className={step === 3 ? 'text-[#0b100e] font-medium' : 'text-[#68726d]'}>Payment Details</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl mx-auto px-1">
        <Card className="rounded-[14px] shadow-sm border-black/[0.08] overflow-hidden">
          <CardContent className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[18px] font-bold text-[#10231d]">Billing Information</h2>
                  <Button variant="outline" className="h-9 px-4 text-[#087f70] border-[#087f70]/30 bg-[#f0faf8] hover:bg-[#e6f7f3] hover:text-[#076b5e] font-medium text-[13px] rounded-[8px]">
                    <ScanLine className="mr-2 h-4 w-4" /> Scan an Invoice
                  </Button>
                </div>
                
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
                      placeholder="e.g. Office Supplies" 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-[#10231d]">Invoice Date</label>
                      <DatePicker date={invoiceDate} setDate={setInvoiceDate} className="rounded-[8px] border-black/[0.08] text-[13px]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-medium text-[#10231d]">Due Date</label>
                      <DatePicker date={dueDate} setDate={setDueDate} className="rounded-[8px] border-black/[0.08] text-[13px]" />
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
                    disabled={!vendorName.trim() || !description.trim() || !invoiceDate || !dueDate}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-[18px] font-bold text-[#10231d]">Line Items</h2>
                  <div className="text-[13px] font-medium text-[#68726d]">Total: <span className="font-bold text-[#10231d]">₦{lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0).toLocaleString()}</span></div>
                </div>
                
                <div className="border border-black/[0.08] rounded-[10px] bg-white overflow-hidden">
                  <BillLineItemBatchModal
                    open={isLineItemModalOpen} 
                    onClose={() => setIsLineItemModalOpen(false)} 
                    onSaveAll={async (items) => {
                      setLineItems(prev => [...prev, ...items]);
                      setIsLineItemModalOpen(false);
                    }}
                    saving={false}
                    currency="NGN"
                    persistKey="add_bill_draft"
                  />

                  {lineItems.length === 0 ? (
                    <div className="text-center py-10 bg-[#f9faf9]">
                      <p className="text-[13px] text-[#68726d] mb-4">You have no line items.</p>
                      <Button 
                        onClick={() => setIsLineItemModalOpen(true)}
                        className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-9 text-[13px] font-semibold"
                      >
                        Add Line Items
                      </Button>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[16px] font-bold text-[#10231d]">Request Items</h3>
                          <span className="flex items-center justify-center bg-[#f9faf9] border border-black/[0.08] text-[#10231d] text-[11px] font-bold rounded-full w-5 h-5">{lineItems.length}</span>
                        </div>
                        <button 
                          onClick={() => setIsLineItemModalOpen(true)}
                          className="flex items-center gap-1.5 text-[13px] font-semibold text-[#087f70] hover:text-[#076b5e] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Item(s)
                        </button>
                      </div>

                      <div className="bg-[#f8fafa] rounded-[8px] flex items-center px-4 py-3 mb-2">
                        <div className="flex-1 text-[13px] font-semibold text-[#52605b]">Name</div>
                        <div className="w-24 text-[13px] font-semibold text-[#52605b]">Qty</div>
                        <div className="w-32 text-[13px] font-semibold text-[#52605b]">Unit Price</div>
                        <div className="w-32 text-[13px] font-semibold text-[#52605b]">Subtotal</div>
                        <div className="w-8"></div>
                      </div>

                      <div className="space-y-1 mb-6">
                        {lineItems.map((item, idx) => (
                          <div key={idx} className="flex items-center px-4 py-4 border-b border-black/[0.04] last:border-0 hover:bg-[#f9faf9]/50 transition-colors">
                            <div className="flex-1 text-[13px] font-bold text-[#10231d]">{item.description}</div>
                            <div className="w-24 text-[13px] font-semibold text-[#10231d]">{item.quantity}</div>
                            <div className="w-32 text-[13px] font-medium text-[#68726d]">{item.unitPrice ? item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : "-"}</div>
                            <div className="w-32 text-[13px] font-bold text-[#10231d]">{((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</div>
                            <div className="w-8 flex justify-end">
                              <button 
                                onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}
                                className="text-[#d33d44] hover:text-red-700 transition-colors p-1"
                              >
                                <Trash2 className="w-[18px] h-[18px]" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <button 
                          onClick={() => setIsLineItemModalOpen(true)}
                          className="flex items-center gap-1.5 text-[13px] font-semibold text-[#087f70] hover:text-[#076b5e] transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Item(s)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-black/[0.06]">
                  <Button variant="outline" className="w-32 h-10 text-[#52605b] border-black/[0.08] rounded-[8px] font-semibold text-[13px] hover:bg-[#f9faf9]" onClick={() => setStep(1)}>Back</Button>
                  <Button 
                    className="w-32 h-10 bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] font-semibold text-[13px]" 
                    onClick={() => setStep(3)}
                    disabled={lineItems.length === 0}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-[18px] font-bold text-[#10231d]">Payment Details</h2>
                
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
                  
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#10231d]">Beneficiary Name</label>
                    <Input 
                      placeholder="Acme Corp" 
                      value={beneficiaryName}
                      onChange={(e) => setBeneficiaryName(e.target.value)}
                      className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#10231d]">Beneficiary Bank</label>
                    <Input 
                      placeholder="Ocean bank" 
                      value={beneficiaryBank}
                      onChange={(e) => setBeneficiaryBank(e.target.value)}
                      className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#10231d]">Account Number</label>
                    <Input 
                      placeholder="123-43535-53523" 
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[#10231d]">Sort Code (Optional)</label>
                    <Input placeholder="057-434244" className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-black/[0.06]">
                  <Button variant="outline" className="w-32 h-10 text-[#52605b] border-black/[0.08] rounded-[8px] font-semibold text-[13px] hover:bg-[#f9faf9]" onClick={() => setStep(2)}>Back</Button>
                  <Button 
                    className="w-48 h-10 bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] font-semibold text-[13px]" 
                    onClick={() => router.push('/bill-pay')}
                    disabled={!beneficiaryName.trim() || !beneficiaryBank.trim() || !accountNumber.trim()}
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
