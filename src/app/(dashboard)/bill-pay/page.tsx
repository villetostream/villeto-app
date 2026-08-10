"use client";

import { useState } from "react";
import { AlertTriangle, BadgeCheck, CircleDollarSign, Landmark, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccountingData } from "@/queries/accounting";
import { useBillPayAction, useBillPayData, type PaymentRequest } from "@/queries/bill-pay";
import { useLegalEntities } from "@/queries/legal-entities";

const money = (value: string | number, currency = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value));

export default function BillPayPage() {
  const entities = useLegalEntities().data?.data || [];
  const [selectedId, setSelectedId] = useState("");
  const legalEntityId = selectedId || entities.find((item) => item.isDefault)?.legalEntityId || entities[0]?.legalEntityId;
  const entity = entities.find((item) => item.legalEntityId === legalEntityId);
  const accounting = useAccountingData(legalEntityId);
  const data = useBillPayData(legalEntityId);
  const action = useBillPayAction();
  const [recording, setRecording] = useState<PaymentRequest | null>(null);
  const [executionDate, setExecutionDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankReference, setBankReference] = useState("");
  const [obligationId, setObligationId] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [fundingId, setFundingId] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [fundingForm, setFundingForm] = useState({ name: "", maskedIdentifier: "", externalReference: "" });
  const [beneficiaryForm, setBeneficiaryForm] = useState({ vendorId: "", name: "", maskedIdentifier: "", externalReference: "" });

  const run = async (path: string, body?: Record<string, unknown>, message = "Updated") => {
    try { await action.mutateAsync({ path, body }); toast.success(message); }
    catch { toast.error("The action could not be completed"); }
  };
  const recordExternal = async () => {
    if (!recording || !bankReference) return;
    await run(`bill-pay/payment-requests/${recording.paymentRequestId}/record-external`, {
      fundingAccountId: recording.fundingAccountId, beneficiaryId: recording.destinationAccountId,
      executionDate, amount: recording.amount, bankReference,
      idempotencyKey: `external:${recording.paymentRequestId}:${bankReference}`,
    }, "External payment recorded; reconciliation is still required");
    setRecording(null); setBankReference("");
  };
  const createRequest = async () => {
    if (!legalEntityId || !obligationId || !requestAmount || !fundingId || !beneficiaryId || !entity) return;
    await run("bill-pay/payment-requests", { legalEntityId, fundingAccountId: fundingId, beneficiaryId, currency: entity.baseCurrency, amount: requestAmount, paymentMethod: "external_bank", idempotencyKey: `request:${crypto.randomUUID()}`, allocations: [{ financialObligationId: obligationId, amount: requestAmount }] }, "Payment request created as draft");
    setObligationId(""); setRequestAmount("");
  };
  const createFunding = async () => {
    if (!legalEntityId || !entity) return;
    await run("bill-pay/funding-accounts", { legalEntityId, accountType: "bank", currency: entity.baseCurrency, ...fundingForm }, "Masked funding account added");
    setFundingForm({ name: "", maskedIdentifier: "", externalReference: "" });
  };
  const createBeneficiary = async () => {
    if (!legalEntityId || !entity) return;
    await run("bill-pay/beneficiaries", { legalEntityId, currency: entity.baseCurrency, ...beneficiaryForm }, "Masked beneficiary added");
    setBeneficiaryForm({ vendorId: "", name: "", maskedIdentifier: "", externalReference: "" });
  };

  return <div className="min-h-screen bg-dashboard-bg p-6 space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h1 className="text-3xl font-bold">Bill Pay</h1><p className="mt-1 text-muted-foreground">Controlled AP payment requests, external recording, and reconciliation</p></div><Select value={legalEntityId || ""} onValueChange={setSelectedId}><SelectTrigger className="w-72"><SelectValue placeholder="Select legal entity" /></SelectTrigger><SelectContent>{entities.map((item) => <SelectItem key={item.legalEntityId} value={item.legalEntityId}>{item.legalName} · {item.baseCurrency}</SelectItem>)}</SelectContent></Select></div>
    <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Payment execution is disabled</p><p className="text-sm">Villeto has no live gateway adapter. Payments must be executed by your bank, recorded here, then reconciled before obligations are reduced.</p></div></div>
    <div className="grid gap-4 md:grid-cols-4"><Summary icon={<CircleDollarSign />} title="Outstanding AP" value={money((accounting.obligations.data || []).reduce((sum, item) => sum + Number(item.outstandingAmount), 0), entity?.baseCurrency)} /><Summary icon={<ShieldCheck />} title="Awaiting approval" value={String((data.requests.data || []).filter((item) => item.status.includes("authoriz")).length)} /><Summary icon={<Landmark />} title="External payments" value={String((data.payments.data || []).filter((item) => item.status === "externally_recorded").length)} /><Summary icon={<BadgeCheck />} title="Entity readiness" value={(entity?.readinessStatus || "not configured").replaceAll("_", " ")} /></div>

    <Tabs defaultValue="obligations"><TabsList className="flex h-auto flex-wrap"><TabsTrigger value="obligations">Obligations</TabsTrigger><TabsTrigger value="requests">Payment requests</TabsTrigger><TabsTrigger value="approvals">Approvals</TabsTrigger><TabsTrigger value="recording">External recording</TabsTrigger><TabsTrigger value="reconciliation">Reconciliation</TabsTrigger><TabsTrigger value="configuration">Configuration</TabsTrigger></TabsList>
      <TabsContent value="obligations"><List title="Outstanding obligations" empty="Approved invoice obligations appear here.">{(accounting.obligations.data || []).map((item) => <Row key={item.financialObligationId} title={`${item.vendor?.displayName || item.vendor?.legalName || "Vendor"} · ${money(item.outstandingAmount, item.currency)}`} detail={`${item.status}${item.dueDate ? ` · due ${item.dueDate}` : ""}`} />)}</List></TabsContent>
      <TabsContent value="requests"><Card className="mb-4"><CardHeader><CardTitle>Create payment request</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-5"><Select value={obligationId} onValueChange={(value) => { setObligationId(value); const item = (accounting.obligations.data || []).find((entry) => entry.financialObligationId === value); if (item) setRequestAmount(item.outstandingAmount); }}><SelectTrigger><SelectValue placeholder="Obligation" /></SelectTrigger><SelectContent>{(accounting.obligations.data || []).filter((item) => item.status !== "paid").map((item) => <SelectItem key={item.financialObligationId} value={item.financialObligationId}>{item.vendor?.displayName || item.vendor?.legalName || "Vendor"} · {money(item.outstandingAmount, item.currency)}</SelectItem>)}</SelectContent></Select><Input type="number" min="0.01" step="0.01" placeholder="Amount" value={requestAmount} onChange={(event) => setRequestAmount(event.target.value)} /><Select value={fundingId} onValueChange={setFundingId}><SelectTrigger><SelectValue placeholder="Funding account" /></SelectTrigger><SelectContent>{(data.funding.data || []).map((item) => <SelectItem key={item.fundingAccountId} value={item.fundingAccountId}>{item.name} · {item.maskedIdentifier}</SelectItem>)}</SelectContent></Select><Select value={beneficiaryId} onValueChange={setBeneficiaryId}><SelectTrigger><SelectValue placeholder="Beneficiary" /></SelectTrigger><SelectContent>{(data.beneficiaries.data || []).map((item) => <SelectItem key={item.vendorBeneficiaryId} value={item.vendorBeneficiaryId}>{item.name} · {item.maskedIdentifier}</SelectItem>)}</SelectContent></Select><Button onClick={createRequest}>Create draft</Button></CardContent></Card><List title="Payment requests" empty="No payment requests have been created.">{(data.requests.data || []).map((item) => <Row key={item.paymentRequestId} title={`${item.vendor?.displayName || item.vendor?.legalName || "Vendor"} · ${money(item.amount, item.currency)}`} detail={item.status} actions={item.status === "draft" ? <Button size="sm" onClick={() => run(`bill-pay/payment-requests/${item.paymentRequestId}/submit`, {}, "Submitted for maker-checker approval")}>Submit</Button> : undefined} />)}</List></TabsContent>
      <TabsContent value="approvals"><List title="Maker-checker approvals" empty="No requests await your authorization.">{(data.requests.data || []).filter((item) => ["pending_authorization", "partially_authorized"].includes(item.status)).map((item) => <Row key={item.paymentRequestId} title={`${item.vendor?.displayName || item.vendor?.legalName || "Vendor"} · ${money(item.amount, item.currency)}`} detail={`Created by ${item.createdBy?.firstName || "another user"}`} actions={<div className="flex gap-2"><Button size="sm" onClick={() => run(`bill-pay/payment-requests/${item.paymentRequestId}/authorize`, {}, "Authorization recorded")}>Authorize</Button><Button size="sm" variant="outline" onClick={() => run(`bill-pay/payment-requests/${item.paymentRequestId}/reject`, { reason: "Rejected in Bill Pay" }, "Request rejected")}>Reject</Button></div>} />)}</List></TabsContent>
      <TabsContent value="recording"><List title="Record bank-executed payments" empty="Authorized requests will appear here.">{(data.requests.data || []).filter((item) => ["authorized", "scheduled"].includes(item.status)).map((item) => <Row key={item.paymentRequestId} title={`${item.vendor?.displayName || item.vendor?.legalName || "Vendor"} · ${money(item.amount, item.currency)}`} detail="No gateway call will be made" actions={<Button size="sm" onClick={() => setRecording(item)}>Record external payment</Button>} />)}</List>{recording && <Card className="mt-4"><CardHeader><CardTitle>External bank confirmation</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Input type="date" value={executionDate} onChange={(event) => setExecutionDate(event.target.value)} /><Input placeholder="Unique bank reference" value={bankReference} onChange={(event) => setBankReference(event.target.value)} /><Button onClick={recordExternal} disabled={!bankReference}>Record only</Button></CardContent></Card>}</TabsContent>
      <TabsContent value="reconciliation"><List title="Reconciliation queue" empty="No external payments await reconciliation.">{(data.payments.data || []).filter((item) => item.status === "externally_recorded").map((item) => <Row key={item.paymentId} title={`${item.externalBankReference} · ${money(item.amount, item.currency)}`} detail={`${item.executionDate || "Execution date pending"} · obligation unchanged`} actions={<Button size="sm" onClick={() => run(`bill-pay/payments/${item.paymentId}/reconcile`, {}, "Payment reconciled and AP reduced")}>Confirm reconciliation</Button>} />)}</List><List title="Imported bank transactions" empty="No bank CSV transactions imported.">{(data.bankTransactions.data || []).map((item) => <Row key={item.bankTransactionId} title={`${item.reference} · ${money(item.amount, item.currency)}`} detail={`${item.transactionDate} · ${item.matchStatus}`} />)}</List></TabsContent>
      <TabsContent value="configuration"><div className="grid gap-4 md:grid-cols-2"><div><Card className="mb-4"><CardHeader><CardTitle>Add masked funding reference</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="Account name" value={fundingForm.name} onChange={(event) => setFundingForm({ ...fundingForm, name: event.target.value })} /><Input placeholder="Masked identifier, e.g. •••• 1234" value={fundingForm.maskedIdentifier} onChange={(event) => setFundingForm({ ...fundingForm, maskedIdentifier: event.target.value })} /><Input placeholder="Opaque vault/external reference" value={fundingForm.externalReference} onChange={(event) => setFundingForm({ ...fundingForm, externalReference: event.target.value })} /><Button onClick={createFunding}>Add funding account</Button></CardContent></Card><List title="Funding accounts" empty="No masked funding references.">{(data.funding.data || []).map((item) => <Row key={item.fundingAccountId} title={item.name} detail={`${item.maskedIdentifier} · ${item.currency}`} />)}</List></div><div><Card className="mb-4"><CardHeader><CardTitle>Add masked vendor beneficiary</CardTitle></CardHeader><CardContent className="space-y-3"><Input placeholder="Vendor UUID" value={beneficiaryForm.vendorId} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, vendorId: event.target.value })} /><Input placeholder="Beneficiary name" value={beneficiaryForm.name} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, name: event.target.value })} /><Input placeholder="Masked identifier" value={beneficiaryForm.maskedIdentifier} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, maskedIdentifier: event.target.value })} /><Input placeholder="Opaque vault/external reference" value={beneficiaryForm.externalReference} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, externalReference: event.target.value })} /><Button onClick={createBeneficiary}>Add beneficiary</Button></CardContent></Card><List title="Vendor beneficiaries" empty="Plaintext vendor bank fields are never used.">{(data.beneficiaries.data || []).map((item) => <Row key={item.vendorBeneficiaryId} title={item.name} detail={`${item.maskedIdentifier} · ${item.currency}`} />)}</List></div></div></TabsContent>
    </Tabs>
  </div>;
}

function Summary({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) { return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 text-xl font-semibold capitalize">{value}</p></div><span className="text-dashboard-accent [&>svg]:h-6 [&>svg]:w-6">{icon}</span></CardContent></Card>; }
function List({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) { return <Card className="mb-4"><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="divide-y">{children.length ? children : <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>}</CardContent></Card>; }
function Row({ title, detail, actions }: { title: string; detail: string; actions?: React.ReactNode }) { return <div className="flex items-center justify-between gap-4 py-4"><div><p className="font-medium">{title}</p><Badge variant="secondary" className="mt-1 capitalize">{detail.replaceAll("_", " ")}</Badge></div>{actions}</div>; }
