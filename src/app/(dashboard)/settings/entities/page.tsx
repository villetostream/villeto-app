"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, CircleAlert, Loader2, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProcurementPageHeader } from "@/components/procurement/ProcurementWorkspace";
import {
  type LegalEntityInput,
  useCreateLegalEntity,
  useCurrencies,
  useLegalEntities,
  useSetDefaultLegalEntity,
  useSetLegalEntityStatus,
} from "@/queries/legal-entities";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { cn } from "@/lib/utils";
import withPermissions from "@/components/permissions/permission-protected-routes";

const emptyForm: LegalEntityInput = {
  code: "",
  legalName: "",
  countryOfRegistration: "",
  registeredAddress: "",
  baseCurrency: "",
  taxId: "",
  registrationId: "",
};

const readinessLabel: Record<string, string> = {
  provisional: "Provisional",
  procurement_ready: "Procurement ready",
  accounting_ready: "Accounting ready",
  payment_workflow_ready: "Payment workflow ready",
};

function LegalEntitiesPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LegalEntityInput>(emptyForm);
  const { data, isLoading, error } = useLegalEntities();
  const { data: currencyData } = useCurrencies();
  const createEntity = useCreateLegalEntity();
  const setDefault = useSetDefaultLegalEntity();
  const setStatus = useSetLegalEntityStatus();

  const entities = data?.data || [];
  const currencies = useMemo(() => currencyData?.data || [], [currencyData?.data]);

  const submit = async () => {
    if (!form.code || !form.legalName || !form.countryOfRegistration || !form.registeredAddress || !form.baseCurrency) {
      toast.error("Complete all required legal entity fields");
      return;
    }
    try {
      await createEntity.mutateAsync(form);
      toast.success("Legal entity created");
      setForm(emptyForm);
      setOpen(false);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Unable to create legal entity"));
    }
  };

  const changeStatus = async (id: string, status: "active" | "inactive") => {
    try {
      await setStatus.mutateAsync({ id, status });
      toast.success(`Legal entity ${status === "active" ? "activated" : "deactivated"}`);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause, "Unable to change legal entity status"));
    }
  };

  return (
    <div className="space-y-6 pb-12 h-full">
      <ProcurementPageHeader 
        title="Legal Entities" 
        description="Entity readiness and base currency control procurement and accounting workflows."
        action={{ label: "Add entity", onClick: () => setOpen(true) }}
      />

      <div className="sm:hidden mb-4">
        <Button onClick={() => setOpen(true)} className="w-full bg-[#087f70] text-white hover:bg-[#076b5e] rounded-[10px] h-10 text-[13px] font-semibold">
          <Plus className="mr-2 size-4" /> Add entity
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-[#087f70]" /></div>
      ) : error ? (
        <div className="rounded-[16px] border border-red-200 bg-red-50 p-5 text-[13px] font-medium text-red-700">Unable to load legal entities.</div>
      ) : entities.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-black/[0.1] bg-[#f9faf9] p-12 flex flex-col items-center justify-center text-center">
          <div className="size-12 rounded-full bg-[#e8f8f5] flex items-center justify-center text-[#087f70] mb-3">
            <Building2 className="size-5" />
          </div>
          <p className="text-[14px] font-bold text-[#0b100e]">No entities found</p>
          <p className="text-[13px] text-[#68726d] mt-1 max-w-[250px]">Configure your first legal entity to unlock accounting features.</p>
          <Button onClick={() => setOpen(true)} className="mt-5 bg-[#087f70] text-white hover:bg-[#076b5e] rounded-[10px] h-9 px-4 text-[13px] font-semibold">
            Create entity
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {entities.map((entity) => (
            <div key={entity.legalEntityId} className="group rounded-[16px] border border-black/[0.06] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:border-black/[0.1] flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#e8f8f5] text-[#087f70] transition-transform group-hover:scale-105">
                    <Building2 className="size-[22px]" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-[16px] font-bold text-[#0b100e]">{entity.legalName}</h2>
                      {entity.isDefault && (
                        <span className="rounded-full bg-[#e8f8f5] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#087f70]">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-[#68726d]">{entity.code} &nbsp;&middot;&nbsp; {entity.countryOfRegistration}</p>
                  </div>
                </div>
                <span className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shrink-0",
                  entity.status === "active" ? "bg-[#e8f8f5] text-[#087f70]" : "bg-[#f4f7f5] text-[#68726d]"
                )}>
                  {entity.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-[12px] bg-[#f9faf9] border border-black/[0.04] p-3">
                  <p className="text-[11px] font-medium text-[#84908a] mb-0.5">Base currency</p>
                  <p className="text-[13px] font-bold text-[#0b100e]">{entity.baseCurrency}</p>
                </div>
                <div className="rounded-[12px] bg-[#f9faf9] border border-black/[0.04] p-3">
                  <p className="text-[11px] font-medium text-[#84908a] mb-0.5">Readiness</p>
                  <p className="text-[13px] font-bold text-[#0b100e]">{readinessLabel[entity.readinessStatus] || entity.readinessStatus}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 mb-4 p-3 rounded-[10px] border border-black/[0.04] bg-[#fafcfb]">
                {entity.readinessBlockers.length ? (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#a46709]" />
                ) : (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#087f70]" />
                )}
                <span className={cn("text-[12px] font-medium", entity.readinessBlockers.length ? "text-[#a46709]" : "text-[#087f70]")}>
                  {entity.readinessBlockers.length ? entity.readinessBlockers.join(", ").replaceAll("_", " ") : "No readiness blockers"}
                </span>
              </div>

              <div className="mt-auto pt-4 border-t border-black/[0.04]">
                <p className="text-[12px] text-[#68726d] mb-4 min-h-[36px]">{entity.registeredAddress}</p>
                <div className="flex flex-wrap gap-2">
                  {!entity.isDefault && entity.status === "active" && (
                    <Button variant="outline" size="sm" onClick={() => setDefault.mutate(entity.legalEntityId)} className="h-9 px-4 text-[12px] font-semibold border-black/[0.1] text-[#0b100e] hover:bg-[#f9faf9] rounded-[8px]">
                      Make default
                    </Button>
                  )}
                  {!entity.isDefault && (
                    <Button variant="outline" size="sm" onClick={() => changeStatus(entity.legalEntityId, entity.status === "active" ? "inactive" : "active")} className="h-9 px-4 text-[12px] font-semibold border-black/[0.1] text-[#0b100e] hover:bg-[#f9faf9] rounded-[8px]">
                      {entity.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-9 px-4 text-[12px] font-semibold text-[#087f70] hover:bg-[#e8f8f5] rounded-[8px] ml-auto">
                    Edit <ArrowRight className="ml-1.5 size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Border radius applied globally in dialog.tsx, but we can structure the content nicer here */}
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-black/[0.06] bg-[#f9faf9]">
             <DialogHeader>
               <DialogTitle className="text-[18px] font-bold text-[#0b100e]">Add legal entity</DialogTitle>
             </DialogHeader>
          </div>
          
          <div className="px-6 py-6 grid gap-x-5 gap-y-4 sm:grid-cols-2 bg-white">
            {[
              ["code", "Entity code", "US_PARENT"],
              ["legalName", "Registered legal name", "Acme Corporation Limited"],
              ["countryOfRegistration", "Registration country", "Nigeria"],
              ["registeredAddress", "Registered address", "12 Marina Road, Lagos"],
              ["registrationId", "Registration ID (optional)", "RC-123456"],
              ["taxId", "Tax ID (optional)", "TIN-123456"],
            ].map(([name, label, placeholder]) => (
              <div className="space-y-1.5" key={name}>
                <Label htmlFor={name} className="text-[12px] font-medium text-[#0b100e]">{label}</Label>
                <Input 
                  id={name} 
                  value={String(form[name as keyof LegalEntityInput] || "")} 
                  placeholder={placeholder} 
                  onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
                  className="h-10 text-[13px] border-black/[0.12] rounded-[8px] focus-visible:ring-1 focus-visible:ring-[#087f70] focus-visible:border-[#087f70]"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-[12px] font-medium text-[#0b100e]">Base currency</Label>
              <Select value={form.baseCurrency} onValueChange={(value) => setForm((current) => ({ ...current, baseCurrency: value }))}>
                <SelectTrigger id="currency" className="h-10 text-[13px] border-black/[0.12] rounded-[8px] focus:ring-1 focus:ring-[#087f70] focus:border-[#087f70]">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="max-h-[250px]">
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <span className="font-bold w-10 inline-block text-[#087f70]">{currency.code}</span>
                      <span className="text-[#68726d] text-[12px] ml-1">{currency.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="px-6 py-5 border-t border-black/[0.06] bg-[#f9faf9]">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOpen(false)} className="h-10 px-5 text-[13px] font-semibold border-black/[0.12] text-[#0b100e] hover:bg-[#f0f4f2] rounded-[10px]">
                Cancel
              </Button>
              <Button disabled={createEntity.isPending} onClick={submit} className="h-10 px-5 text-[13px] font-semibold bg-[#087f70] text-white hover:bg-[#076b5e] rounded-[10px]">
                {createEntity.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create entity
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withPermissions(LegalEntitiesPage, [
  { resource: "legal_entity", action: "view" },
]);

