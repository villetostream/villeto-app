"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, CircleAlert, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type LegalEntityInput,
  useCreateLegalEntity,
  useCurrencies,
  useLegalEntities,
  useSetDefaultLegalEntity,
  useSetLegalEntityStatus,
} from "@/queries/legal-entities";
import { getApiErrorMessage } from "@/lib/types/api-error";

const emptyForm: LegalEntityInput = {
  code: "",
  legalName: "",
  countryOfRegistration: "",
  registeredAddress: "",
  baseCurrency: "",
  taxId: "",
  registrationId: "",
};

const readinessLabel = {
  provisional: "Provisional",
  procurement_ready: "Procurement ready",
  accounting_ready: "Accounting ready",
  payment_workflow_ready: "Payment workflow ready",
};

export default function LegalEntitiesPage() {
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
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b100e]">Legal entities</h1>
          <p className="mt-1 text-sm text-[#68726d]">Entity readiness and base currency control procurement and accounting.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 size-4" />Add entity</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin" /></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load legal entities.</div>
      ) : entities.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-[#68726d]">No legal entities are configured.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {entities.map((entity) => (
            <div key={entity.legalEntityId} className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#e8f7f4] text-[#087f70]"><Building2 className="size-5" /></div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[#0b100e]">{entity.legalName}</h2>
                      {entity.isDefault && <Badge>Default</Badge>}
                    </div>
                    <p className="text-xs text-[#68726d]">{entity.code} · {entity.countryOfRegistration}</p>
                  </div>
                </div>
                <Badge variant={entity.status === "active" ? "default" : "secondary"}>{entity.status}</Badge>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-[#f7f9f8] p-3"><p className="text-xs text-[#68726d]">Base currency</p><p className="font-semibold">{entity.baseCurrency}</p></div>
                <div className="rounded-lg bg-[#f7f9f8] p-3"><p className="text-xs text-[#68726d]">Readiness</p><p className="font-semibold">{readinessLabel[entity.readinessStatus]}</p></div>
              </div>

              <div className="mt-4 flex items-start gap-2 text-sm">
                {entity.readinessBlockers.length ? <CircleAlert className="mt-0.5 size-4 text-amber-600" /> : <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />}
                <span className={entity.readinessBlockers.length ? "text-amber-700" : "text-emerald-700"}>
                  {entity.readinessBlockers.length ? entity.readinessBlockers.join(", ").replaceAll("_", " ") : "No readiness blockers"}
                </span>
              </div>

              <p className="mt-4 text-sm text-[#68726d]">{entity.registeredAddress}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {!entity.isDefault && entity.status === "active" && <Button variant="outline" size="sm" onClick={() => setDefault.mutate(entity.legalEntityId)}>Make default</Button>}
                {!entity.isDefault && <Button variant="outline" size="sm" onClick={() => changeStatus(entity.legalEntityId, entity.status === "active" ? "inactive" : "active")}>{entity.status === "active" ? "Deactivate" : "Activate"}</Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Add legal entity</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            {[
              ["code", "Entity code", "US_PARENT"],
              ["legalName", "Registered legal name", "Acme Corporation Limited"],
              ["countryOfRegistration", "Registration country", "Nigeria"],
              ["registeredAddress", "Registered address", "12 Marina Road, Lagos"],
              ["registrationId", "Registration ID (optional)", "RC-123456"],
              ["taxId", "Tax ID (optional)", "TIN-123456"],
            ].map(([name, label, placeholder]) => (
              <div className="space-y-2" key={name}>
                <Label htmlFor={name}>{label}</Label>
                <Input id={name} value={String(form[name as keyof LegalEntityInput] || "")} placeholder={placeholder} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="currency">Base currency</Label>
              <select id="currency" className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={form.baseCurrency} onChange={(event) => setForm((current) => ({ ...current, baseCurrency: event.target.value }))}>
                <option value="">Select currency</option>
                {currencies.map((currency) => <option value={currency.code} key={currency.code}>{currency.code} — {currency.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={createEntity.isPending} onClick={submit}>{createEntity.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}Create entity</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
