"use client";

import { useMemo, useState } from "react";
import { BookOpen, CalendarRange, CircleDollarSign, Landmark, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLegalEntities } from "@/queries/legal-entities";
import { useAccountingData, useProvisionAccounting } from "@/queries/accounting";

const money = (value: string | number, currency = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value));

export default function AccountingPage() {
  const entitiesQuery = useLegalEntities();
  const entities = entitiesQuery.data?.data || [];
  const [selectedId, setSelectedId] = useState("");
  const legalEntityId = selectedId || entities.find((entity) => entity.isDefault)?.legalEntityId || entities[0]?.legalEntityId;
  const entity = entities.find((item) => item.legalEntityId === legalEntityId);
  const data = useAccountingData(legalEntityId);
  const provision = useProvisionAccounting();
  const outstanding = useMemo(() => (data.obligations.data || []).reduce((total, item) => total + Number(item.outstandingAmount), 0), [data.obligations.data]);

  const provisionChart = async () => {
    if (!legalEntityId) return;
    try { await provision.mutateAsync(legalEntityId); toast.success("AP subledger configured"); }
    catch { toast.error("Could not configure the AP subledger"); }
  };

  return <div className="min-h-screen bg-dashboard-bg p-6 space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div><h1 className="text-3xl font-bold text-dashboard-text-primary">Accounting</h1><p className="text-dashboard-text-secondary mt-1">Villeto AP subledger, fiscal controls, journals, and obligations</p></div>
      <div className="flex gap-3">
        <Select value={legalEntityId || ""} onValueChange={setSelectedId}><SelectTrigger className="w-72"><SelectValue placeholder="Select legal entity" /></SelectTrigger><SelectContent>{entities.map((item) => <SelectItem key={item.legalEntityId} value={item.legalEntityId}>{item.legalName} · {item.baseCurrency}</SelectItem>)}</SelectContent></Select>
        <Button onClick={provisionChart} disabled={!legalEntityId || provision.isPending}><Settings2 className="mr-2 h-4 w-4" />{provision.isPending ? "Configuring…" : "Configure subledger"}</Button>
      </div>
    </div>

    {entity && <div className="grid gap-4 md:grid-cols-4">
      <Summary title="Entity readiness" value={entity.readinessStatus.replaceAll("_", " ")} icon={<Landmark />} />
      <Summary title="Chart accounts" value={String(data.accounts.data?.length || 0)} icon={<BookOpen />} />
      <Summary title="Posted journals" value={String((data.journals.data || []).filter((item) => item.status === "posted").length)} icon={<CalendarRange />} />
      <Summary title="Outstanding AP" value={money(outstanding, entity.baseCurrency)} icon={<CircleDollarSign />} />
    </div>}

    {!legalEntityId ? <Card><CardContent className="py-16 text-center text-muted-foreground">Create a legal entity before configuring accounting.</CardContent></Card> :
      <Tabs defaultValue="accounts"><TabsList><TabsTrigger value="accounts">Chart of accounts</TabsTrigger><TabsTrigger value="periods">Fiscal periods</TabsTrigger><TabsTrigger value="journals">Journals</TabsTrigger><TabsTrigger value="obligations">Obligations</TabsTrigger><TabsTrigger value="trial">Trial balance</TabsTrigger></TabsList>
        <TabsContent value="accounts"><DataCard title="Chart of accounts" empty="Configure the subledger to seed the required accounts.">{(data.accounts.data || []).map((item) => <Row key={item.ledgerAccountId} primary={`${item.code} · ${item.name}`} secondary={`${item.accountType} · ${item.purpose.replaceAll("_", " ")}`} />)}</DataCard></TabsContent>
        <TabsContent value="periods"><DataCard title="Fiscal periods" empty="No fiscal periods configured.">{(data.periods.data || []).map((item) => <Row key={item.fiscalPeriodId} primary={item.name} secondary={`${item.startDate} – ${item.endDate} · ${item.status}`} />)}</DataCard></TabsContent>
        <TabsContent value="journals"><DataCard title="Immutable journals" empty="No invoice approvals have posted yet.">{(data.journals.data || []).map((item) => <Row key={item.journalEntryId} primary={`${item.entryNumber} · ${item.description}`} secondary={`${item.postingDate} · ${item.status} · ${item.currency}`} />)}</DataCard></TabsContent>
        <TabsContent value="obligations"><DataCard title="Financial obligations" empty="Approved invoice obligations will appear here.">{(data.obligations.data || []).map((item) => <Row key={item.financialObligationId} primary={`${item.vendor?.displayName || item.vendor?.legalName || "Vendor"} · ${money(item.outstandingAmount, item.currency)}`} secondary={`${item.status}${item.dueDate ? ` · due ${item.dueDate}` : ""}`} />)}</DataCard></TabsContent>
        <TabsContent value="trial"><DataCard title="Trial balance" empty="No posted balances.">{(data.trialBalance.data || []).map((item) => <Row key={item.ledgerAccountId} primary={`${item.code} · ${item.name}`} secondary={`Debit ${money(item.debitTotal, entity?.baseCurrency)} · Credit ${money(item.creditTotal, entity?.baseCurrency)}`} />)}</DataCard></TabsContent>
      </Tabs>}
  </div>;
}

function Summary({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) { return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 text-xl font-semibold capitalize">{value}</p></div><span className="text-dashboard-accent [&>svg]:h-6 [&>svg]:w-6">{icon}</span></CardContent></Card>; }
function DataCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) { return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="divide-y">{children.length ? children : <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>}</CardContent></Card>; }
function Row({ primary, secondary }: { primary: string; secondary: string }) { return <div className="flex items-center justify-between gap-4 py-4"><p className="font-medium">{primary}</p><p className="text-sm capitalize text-muted-foreground">{secondary}</p></div>; }
