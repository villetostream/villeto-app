"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Landmark,
  Loader2,
  RefreshCcw,
  Scale,
  Settings2,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLegalEntities } from "@/queries/legal-entities";
import { useAccountingData, useProvisionAccounting } from "@/queries/accounting";

const money = (value: string | number, currency = "USD") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
    : "Not set";

interface PageProps {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function AccountingPage(props: PageProps) {
  const entitiesQuery = useLegalEntities();
  const entities = entitiesQuery.data?.data || [];
  const [selectedId, setSelectedId] = useState("");
  const legalEntityId = selectedId || entities.find((item) => item.isDefault)?.legalEntityId || entities[0]?.legalEntityId;
  const entity = entities.find((item) => item.legalEntityId === legalEntityId);
  const data = useAccountingData(legalEntityId);
  const provision = useProvisionAccounting();

  const accounts = data.accounts.data || [];
  const periods = data.periods.data || [];
  const journals = data.journals.data || [];
  const obligations = useMemo(() => data.obligations.data || [], [data.obligations.data]);
  const trialBalance = useMemo(() => data.trialBalance.data || [], [data.trialBalance.data]);
  const currency = entity?.baseCurrency || "USD";
  const outstanding = useMemo(
    () => obligations.reduce((total, item) => total + Number(item.outstandingAmount || 0), 0),
    [obligations],
  );
  const postedJournals = journals.filter((item) => item.status === "posted");
  const openPeriods = periods.filter((item) => item.status === "open");
  const trialTotals = useMemo(
    () =>
      trialBalance.reduce(
        (totals, item) => ({
          debit: totals.debit + Number(item.debitTotal || 0),
          credit: totals.credit + Number(item.creditTotal || 0),
        }),
        { debit: 0, credit: 0 },
      ),
    [trialBalance],
  );
  const isBalanced = Math.abs(trialTotals.debit - trialTotals.credit) < 0.01;
  const isLoading = entitiesQuery.isLoading || data.accounts.isLoading;

  const provisionChart = async () => {
    if (!legalEntityId) return;
    try {
      await provision.mutateAsync(legalEntityId);
      toast.success(accounts.length ? "Accounting configuration refreshed" : "AP subledger configured");
    } catch {
      toast.error("Could not configure the AP subledger");
    }
  };

  const refresh = () => {
    void Promise.all([
      data.accounts.refetch(),
      data.periods.refetch(),
      data.journals.refetch(),
      data.obligations.refetch(),
      data.trialBalance.refetch(),
    ]);
  };

  return (
    <div className="space-y-5 pb-8">
      <section className="flex flex-col gap-5 border-b border-black/[0.07] pb-5 pt-1 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#10231d] md:text-[28px]">Accounting control center</h1>
          <p className="mt-2 text-sm leading-5 text-[#718079]">
            Review the AP subledger, fiscal periods, immutable journals, obligations, and account balances for each legal entity.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={legalEntityId || ""} onValueChange={setSelectedId}>
            <SelectTrigger className="h-10! w-full rounded-[10px] border-black/[0.08] bg-white px-3 shadow-none sm:w-72">
              <SelectValue placeholder="Select legal entity" />
            </SelectTrigger>
            <SelectContent className="rounded-[10px] border-black/[0.08]">
              {entities.map((item) => (
                <SelectItem key={item.legalEntityId} value={item.legalEntityId} className="rounded-[7px]">
                  {item.legalName} · {item.baseCurrency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refresh} disabled={!legalEntityId} className="size-10 rounded-[10px] border-black/[0.08] bg-white text-[#64716c] shadow-none hover:bg-[#f3f8f6] hover:text-[#087f70]">
            <RefreshCcw className="size-4" />
            <span className="sr-only">Refresh accounting data</span>
          </Button>
          <Button onClick={provisionChart} disabled={!legalEntityId || provision.isPending} className="h-10 rounded-[10px] px-4 text-[11px] font-semibold shadow-none">
            {provision.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Settings2 className="mr-2 size-4" />}
            {accounts.length ? "Refresh configuration" : "Configure subledger"}
          </Button>
        </div>
      </section>

      {!legalEntityId ? (
        <AccountingEmpty
          icon={<Landmark />}
          title="A legal entity is required"
          detail="Complete legal-entity setup before configuring accounts, fiscal periods, and invoice posting."
        />
      ) : (
        <>
          <section className="overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)]">
            <div className="grid lg:grid-cols-[1.35fr_repeat(3,0.65fr)]">
              <div className="border-b border-black/[0.06] p-5 lg:border-b-0 lg:border-r">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-[#e8f8f5] text-[#087f70]"><Landmark className="size-4.5" /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-[14px] font-semibold text-[#15251f]">{entity?.legalName}</h2>
                        {entity?.isDefault && <span className="rounded-full bg-[#edf7f4] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[#087f70]">Default</span>}
                      </div>
                      <p className="mt-1 text-[10px] text-[#82908a]">{entity?.code} · {entity?.countryOfRegistration} · {currency}</p>
                    </div>
                  </div>
                  <ReadinessBadge value={entity?.readinessStatus || "provisional"} />
                </div>
                {entity?.readinessBlockers?.length ? (
                  <div className="mt-4 flex items-start gap-2 rounded-[9px] bg-[#fff8e8] px-3 py-2 text-[10px] leading-4 text-[#94620d]">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                    <span>{entity.readinessBlockers[0]}</span>
                  </div>
                ) : null}
              </div>
              <OverviewMetric label="Chart accounts" value={String(accounts.length)} detail={`${accounts.filter((item) => item.isActive).length} active`} icon={<BookOpen />} />
              <OverviewMetric label="Open periods" value={String(openPeriods.length)} detail={`${periods.length} configured`} icon={<CalendarRange />} />
              <OverviewMetric label="Outstanding AP" value={money(outstanding, currency)} detail={`${obligations.filter((item) => item.status !== "settled").length} obligations`} icon={<CircleDollarSign />} />
            </div>
          </section>

          <Tabs defaultValue="accounts" className="gap-4">
            <div className="overflow-x-auto">
              <TabsList className="h-10 min-w-max rounded-[10px] border border-black/[0.06] bg-[#eaf0ed] p-1">
                <AccountingTab value="accounts" icon={<BookOpen />}>Chart of accounts</AccountingTab>
                <AccountingTab value="periods" icon={<CalendarRange />}>Fiscal periods</AccountingTab>
                <AccountingTab value="journals" icon={<FileText />}>Journals</AccountingTab>
                <AccountingTab value="obligations" icon={<WalletCards />}>Obligations</AccountingTab>
                <AccountingTab value="trial" icon={<Scale />}>Trial balance</AccountingTab>
              </TabsList>
            </div>

            <TabsContent value="accounts">
              <AccountingPanel title="Chart of accounts" description="Purpose-led accounts used by automated invoice posting" isLoading={isLoading} empty="Configure the subledger to seed the required accounts.">
                <AccountingTable headers={["Account", "Type", "Purpose", "Status"]}>
                  {accounts.map((item) => (
                    <tr key={item.ledgerAccountId} className="border-t border-black/[0.05] first:border-t-0 hover:bg-[#f9fbfa]">
                      <PrimaryCell title={item.name} detail={item.code} />
                      <TextCell value={item.accountType} capitalize />
                      <TextCell value={item.purpose.replaceAll("_", " ")} capitalize />
                      <td className="px-5 py-3.5"><StatusPill value={item.isActive ? "active" : "inactive"} /></td>
                    </tr>
                  ))}
                </AccountingTable>
              </AccountingPanel>
            </TabsContent>

            <TabsContent value="periods">
              <AccountingPanel title="Fiscal periods" description="Posting windows that control when journals may be recorded" isLoading={data.periods.isLoading} empty="No fiscal periods configured.">
                <AccountingTable headers={["Period", "Start date", "End date", "Status"]}>
                  {periods.map((item) => (
                    <tr key={item.fiscalPeriodId} className="border-t border-black/[0.05] first:border-t-0 hover:bg-[#f9fbfa]">
                      <PrimaryCell title={item.name} detail="Fiscal period" />
                      <TextCell value={formatDate(item.startDate)} />
                      <TextCell value={formatDate(item.endDate)} />
                      <td className="px-5 py-3.5"><StatusPill value={item.status} /></td>
                    </tr>
                  ))}
                </AccountingTable>
              </AccountingPanel>
            </TabsContent>

            <TabsContent value="journals">
              <AccountingPanel title="Immutable journals" description={`${postedJournals.length} posted entries · corrections are recorded by reversal`} isLoading={data.journals.isLoading} empty="No invoice approvals have posted yet.">
                <AccountingTable headers={["Entry", "Posting date", "Lines", "Currency", "Status"]}>
                  {journals.map((item) => (
                    <tr key={item.journalEntryId} className="border-t border-black/[0.05] first:border-t-0 hover:bg-[#f9fbfa]">
                      <PrimaryCell title={item.entryNumber} detail={item.description} />
                      <TextCell value={formatDate(item.postingDate)} />
                      <TextCell value={`${item.lines?.length || 0} lines`} />
                      <TextCell value={item.currency} />
                      <td className="px-5 py-3.5"><StatusPill value={item.status} /></td>
                    </tr>
                  ))}
                </AccountingTable>
              </AccountingPanel>
            </TabsContent>

            <TabsContent value="obligations">
              <AccountingPanel title="Financial obligations" description="Approved invoices awaiting full or partial settlement" isLoading={data.obligations.isLoading} empty="Approved invoice obligations will appear here.">
                <AccountingTable headers={["Vendor", "Original", "Outstanding", "Due date", "Status"]}>
                  {obligations.map((item) => (
                    <tr key={item.financialObligationId} className="border-t border-black/[0.05] first:border-t-0 hover:bg-[#f9fbfa]">
                      <PrimaryCell title={item.vendor?.displayName || item.vendor?.legalName || "Vendor"} detail={item.financialObligationId.slice(0, 8).toUpperCase()} />
                      <TextCell value={money(item.originalAmount, item.currency)} strong />
                      <TextCell value={money(item.outstandingAmount, item.currency)} strong />
                      <TextCell value={formatDate(item.dueDate)} />
                      <td className="px-5 py-3.5"><StatusPill value={item.status} /></td>
                    </tr>
                  ))}
                </AccountingTable>
              </AccountingPanel>
            </TabsContent>

            <TabsContent value="trial">
              <AccountingPanel
                title="Trial balance"
                description={`${money(trialTotals.debit, currency)} debit · ${money(trialTotals.credit, currency)} credit`}
                isLoading={data.trialBalance.isLoading}
                empty="No posted balances."
                aside={<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-semibold ${isBalanced ? "bg-[#e8f8f5] text-[#087f70]" : "bg-[#fff0f1] text-[#b93643]"}`}>{isBalanced ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}{isBalanced ? "Balanced" : "Out of balance"}</span>}
              >
                <AccountingTable headers={["Account", "Debit", "Credit", "Net movement"]}>
                  {trialBalance.map((item) => {
                    const net = Number(item.debitTotal || 0) - Number(item.creditTotal || 0);
                    return (
                      <tr key={item.ledgerAccountId} className="border-t border-black/[0.05] first:border-t-0 hover:bg-[#f9fbfa]">
                        <PrimaryCell title={item.name} detail={item.code} />
                        <TextCell value={money(item.debitTotal, currency)} strong />
                        <TextCell value={money(item.creditTotal, currency)} strong />
                        <TextCell value={money(Math.abs(net), currency)} />
                      </tr>
                    );
                  })}
                </AccountingTable>
              </AccountingPanel>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function ReadinessBadge({ value }: { value: string }) {
  const ready = value !== "provisional";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${ready ? "bg-[#e8f8f5] text-[#087f70]" : "bg-[#fff6df] text-[#9a650b]"}`}>{value.replaceAll("_", " ")}</span>;
}

function OverviewMetric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="border-b border-black/[0.06] p-5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[12px] font-medium text-[#84918b]">{label}</p><p className="mt-2 text-[22px] font-semibold tracking-[-0.035em] text-[#15231e]">{value}</p></div>
        <span className="flex size-8 items-center justify-center rounded-[9px] bg-[#eff7f4] text-[#087f70] [&>svg]:size-4">{icon}</span>
      </div>
      <p className="mt-2 text-[11px] text-[#96a09c]">{detail}</p>
    </div>
  );
}

function AccountingTab({ value, icon, children }: { value: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <TabsTrigger value={value} className="h-8 flex-none rounded-[7px] px-4 text-[13px] font-semibold text-[#69766f] data-[state=active]:bg-white data-[state=active]:text-[#10231d] data-[state=active]:shadow-sm [&>svg]:size-4">{icon}{children}</TabsTrigger>;
}

function AccountingPanel({ title, description, empty, isLoading, aside, children }: { title: string; description: string; empty: string; isLoading: boolean; aside?: React.ReactNode; children: React.ReactNode }) {
  const hasRows = Array.isArray((children as React.ReactElement<{ children?: React.ReactNode }>).props?.children)
    ? ((children as React.ReactElement<{ children?: React.ReactNode[] }>).props.children?.length || 0) > 0
    : Boolean((children as React.ReactElement<{ children?: React.ReactNode }>).props?.children);
  return (
    <section className="overflow-hidden rounded-[15px] border border-black/[0.07] bg-white shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)]">
      <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-5 py-4">
        <div><h2 className="text-[15px] font-semibold text-[#14231e]">{title}</h2><p className="mt-0.5 text-[12px] text-[#84908a]">{description}</p></div>
        {aside}
      </div>
      {isLoading ? <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#7d8984]"><Loader2 className="size-4 animate-spin text-[#087f70]" /> Loading accounting data</div> : hasRows ? children : <div className="flex flex-col items-center py-16 text-center"><span className="flex size-10 items-center justify-center rounded-[11px] bg-[#eff7f4] text-[#087f70]"><FileText className="size-4" /></span><p className="mt-3 text-[13px] font-medium text-[#6d7974]">{empty}</p></div>}
    </section>
  );
}

function AccountingTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#fafcfb]"><tr>{headers.map((header) => <th key={header} className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8a9590]">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function PrimaryCell({ title, detail }: { title: string; detail: string }) {
  return <td className="max-w-xs px-5 py-3.5"><p className="truncate text-[13px] font-semibold text-[#17251f]">{title}</p><p className="mt-0.5 truncate text-[11px] text-[#929c97]">{detail}</p></td>;
}

function TextCell({ value, capitalize = false, strong = false }: { value: string; capitalize?: boolean; strong?: boolean }) {
  return <td className={`px-5 py-3.5 text-[13px] text-[#67736e] ${capitalize ? "capitalize" : ""} ${strong ? "font-semibold text-[#26342e]" : ""}`}>{value}</td>;
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const positive = ["active", "open", "posted", "settled", "paid", "completed"].includes(normalized);
  const warning = ["pending", "draft", "partially_paid", "outstanding"].includes(normalized);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${positive ? "bg-[#e8f8f5] text-[#087f70]" : warning ? "bg-[#fff6df] text-[#9a650b]" : "bg-[#f0f3f2] text-[#65716c]"}`}>{value.replaceAll("_", " ")}</span>;
}

function AccountingEmpty({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <section className="flex flex-col items-center rounded-[16px] border border-dashed border-black/[0.09] bg-white px-6 py-20 text-center"><span className="flex size-12 items-center justify-center rounded-[14px] bg-[#e8f8f5] text-[#087f70] [&>svg]:size-5">{icon}</span><h2 className="mt-4 text-[16px] font-semibold text-[#16251f]">{title}</h2><p className="mt-1.5 max-w-md text-[13px] leading-5 text-[#7b8782]">{detail}</p></section>;
}
