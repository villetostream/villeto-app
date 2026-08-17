"use client";

import { useState } from "react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export function ConfigureEmailModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [emails, setEmails] = useState<string[]>([""]);

  const resetAndClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setEmails([""]);
    }, 300);
  };

  const removeEmail = (index: number) => {
    const newEmails = [...emails];
    newEmails.splice(index, 1);
    setEmails(newEmails);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 rounded-[20px]">
        <div className="p-8">
          {step === 1 ? (
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 bg-[#f0faf8] rounded-full flex items-center justify-center mb-6">
                <Mail className="h-10 w-10 text-[#087f70] stroke-[1.5]" />
              </div>
              
              <DialogHeader className="flex flex-col items-center space-y-3">
                <DialogTitle className="text-[22px] font-bold text-[#10231d]">Configure Invoice Email</DialogTitle>
                <DialogDescription className="text-[#68726d] text-[14px] max-w-sm text-center">
                  Create a dedicated email address where vendors can send invoices directly. Invoices will be automatically processed and added to your queue.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-8 w-full text-left">
                <p className="text-[11px] font-bold text-[#84908a] tracking-wider mb-4 uppercase">HOW IT WORKS</p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-[#f0faf8] text-[#087f70] flex items-center justify-center text-[13px] font-bold shrink-0 mt-0.5">1</div>
                    <p className="text-[13px] text-[#10231d] font-medium mt-1">We generate a unique email address for your organization</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-[#f0faf8] text-[#087f70] flex items-center justify-center text-[13px] font-bold shrink-0 mt-0.5">2</div>
                    <p className="text-[13px] text-[#10231d] font-medium mt-1">Share it with vendors or set up email forwarding</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-[#f0faf8] text-[#087f70] flex items-center justify-center text-[13px] font-bold shrink-0 mt-0.5">3</div>
                    <p className="text-[13px] text-[#10231d] font-medium mt-1">Incoming invoices are auto-extracted and queued for review</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 w-full">
                <div className="flex items-center gap-2 border border-[#087f70]/20 bg-[#f0faf8]/50 rounded-[8px] p-2.5">
                  <div className="text-[#087f70]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span className="text-[12px] text-[#10231d] font-semibold">OCR Extraction</span>
                </div>
                <div className="flex items-center gap-2 border border-[#087f70]/20 bg-[#f0faf8]/50 rounded-[8px] p-2.5">
                  <div className="text-[#087f70]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span className="text-[12px] text-[#10231d] font-semibold">Duplicate Detection</span>
                </div>
                <div className="flex items-center gap-2 border border-[#087f70]/20 bg-[#f0faf8]/50 rounded-[8px] p-2.5">
                  <div className="text-[#087f70]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span className="text-[12px] text-[#10231d] font-semibold">Auto-categorization</span>
                </div>
                <div className="flex items-center gap-2 border border-[#087f70]/20 bg-[#f0faf8]/50 rounded-[8px] p-2.5">
                  <div className="text-[#087f70]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <span className="text-[12px] text-[#10231d] font-semibold">Sender Filtering</span>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-4 w-full">
                <Button variant="outline" className="flex-1 h-11 text-[#10231d] font-semibold border-black/[0.08] rounded-[8px] hover:bg-[#f9faf9]" onClick={resetAndClose}>Cancel</Button>
                <Button className="flex-1 h-11 bg-[#087f70] hover:bg-[#076b5e] font-semibold text-white rounded-[8px]" onClick={() => setStep(2)}>Get Started</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <DialogHeader className="mb-6 space-y-2">
                <DialogTitle className="text-[20px] font-bold text-[#10231d]">Configure Invoice Email</DialogTitle>
                <DialogDescription className="text-[13px] text-[#68726d]">
                  Set up a dedicated email address where vendors can send invoices directly to Villeto.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-3">
                  {/* Scrollable email list */}
                  <div className="max-h-[220px] overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
                    {emails.map((email, index) => (
                      <div key={index} className="space-y-2 relative">
                        <div className="flex justify-between items-center">
                          <label className="text-[12px] font-semibold text-[#10231d]">
                            Invoice Email Address {emails.length > 1 ? index + 1 : ""}
                          </label>
                          {emails.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeEmail(index)}
                              className="text-[11px] font-semibold text-[#d33d44] hover:text-[#b9353c] flex items-center transition-colors"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </button>
                          )}
                        </div>
                        <Input 
                          placeholder="e.g., accounts@yourcompany.com" 
                          value={email}
                          onChange={(e) => {
                            const newEmails = [...emails];
                            newEmails[index] = e.target.value;
                            setEmails(newEmails);
                          }}
                          className="h-11 border-black/[0.08] focus-visible:ring-[#087f70] rounded-[8px] text-[13px]"
                        />
                      </div>
                    ))}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setEmails([...emails, ""])}
                    className="flex items-center text-[#087f70] text-[13px] font-semibold hover:text-[#076b5e] transition-colors"
                  >
                   <Plus className="mr-1 h-4 w-4" /> Add Another Email Address
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[11px] font-bold text-[#84908a] tracking-wider uppercase">PROCESSING RULES</p>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox defaultChecked className="data-[state=checked]:bg-[#087f70] data-[state=checked]:border-[#087f70] border-black/[0.12] w-5 h-5 rounded-[4px]" />
                      <span className="text-[13px] text-[#10231d] font-medium">Auto-extract invoice data using OCR</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox defaultChecked className="data-[state=checked]:bg-[#087f70] data-[state=checked]:border-[#087f70] border-black/[0.12] w-5 h-5 rounded-[4px]" />
                      <span className="text-[13px] text-[#10231d] font-medium">Flag duplicate invoices automatically</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox defaultChecked className="data-[state=checked]:bg-[#087f70] data-[state=checked]:border-[#087f70] border-black/[0.12] w-5 h-5 rounded-[4px]" />
                      <span className="text-[13px] text-[#10231d] font-medium">Require manual review for invoices</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox className="data-[state=checked]:bg-[#087f70] data-[state=checked]:border-[#087f70] border-black/[0.12] w-5 h-5 rounded-[4px]" />
                      <span className="text-[13px] text-[#10231d] font-medium">Send email confirmation to sender on receipt</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-center gap-4 w-full">
                <Button variant="outline" className="w-32 h-11 text-[#10231d] border-black/[0.08] font-semibold rounded-[8px] hover:bg-[#f9faf9]" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1 h-11 bg-[#087f70] hover:bg-[#076b5e] font-semibold text-white rounded-[8px] border-0" onClick={resetAndClose}>Save Configuration</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
