"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Eye,
  Inbox,
  Loader2,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { useEligibleLegalEntities } from "@/queries/legal-entities";
import {
  MailboxMessageSummary,
  TenantMailboxConnection,
  useDisconnectTenantMailbox,
  useDownloadTenantMailboxAttachment,
  useStartGoogleMailboxAuthorization,
  useTenantMailboxConnections,
  useTenantMailboxMessage,
  useTenantMailboxMessages,
} from "@/queries/bill-pay-mailboxes";

const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value))
    : "Not available";

const statusLabel: Record<TenantMailboxConnection["status"], string> = {
  pending_authorization: "Awaiting authorization",
  connected: "Connected",
  disconnected: "Disconnected",
  requires_reauthorization: "Reconnect required",
  error: "Connection issue",
};

const statusVariant = (status: TenantMailboxConnection["status"]) => {
  if (status === "connected") return "active";
  if (status === "pending_authorization") return "pending";
  if (status === "error" || status === "requires_reauthorization") return "rejected";
  return "inactive";
};

function MailboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const policies = useAuthorizationPolicies();
  // Mailbox access supports invoice review and manual Bill Pay intake; it does
  // not initiate or authorize money movement. Accounting readiness is the
  // appropriate gate, while payment-workflow readiness remains reserved for
  // payment-request submission and authorization.
  const entitiesQuery = useEligibleLegalEntities("accounting");
  const entities = entitiesQuery.data || [];
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [disconnecting, setDisconnecting] = useState<TenantMailboxConnection | null>(null);
  const effectiveEntityId = selectedEntityId || entities.find((entity) => entity.isDefault)?.legalEntityId || (entities.length === 1 ? entities[0].legalEntityId : "");
  const connectionsQuery = useTenantMailboxConnections(effectiveEntityId || undefined);
  const connections = connectionsQuery.data?.data || [];
  const selectedConnection = connections.find((connection) => connection.tenantMailboxConnectionId === selectedConnectionId) || connections.find((connection) => connection.status === "connected") || null;
  const messagesQuery = useTenantMailboxMessages(
    policies.billPay.canViewMailboxEmail && selectedConnection?.status === "connected"
      ? selectedConnection.tenantMailboxConnectionId
      : undefined,
  );
  const messageSummaries = useMemo(
    () => messagesQuery.data?.pages.flatMap((page) => page.messages) || [],
    [messagesQuery.data],
  );
  const selectedMessage = useTenantMailboxMessage(
    selectedConnection?.tenantMailboxConnectionId,
    selectedMessageId || undefined,
  );
  const startAuthorization = useStartGoogleMailboxAuthorization();
  const disconnect = useDisconnectTenantMailbox();
  const download = useDownloadTenantMailboxAttachment();

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    if (!oauth) return;
    if (oauth === "connected") {
      toast.success("Gmail mailbox connected");
    } else {
      toast.error("Gmail authorization was not completed");
    }
    router.replace("/bill-pay/mailbox");
  }, [router, searchParams]);

  const connectMailbox = async () => {
    if (!effectiveEntityId) {
      toast.error("Select a legal entity before connecting a mailbox");
      return;
    }
    try {
      const result = await startAuthorization.mutateAsync({ legalEntityId: effectiveEntityId });
      window.location.assign(result.authorizationUrl);
    } catch {
      toast.error("Could not start Gmail authorization");
    }
  };

  const disconnectMailbox = async () => {
    if (!disconnecting) return;
    try {
      await disconnect.mutateAsync(disconnecting.tenantMailboxConnectionId);
      setSelectedConnectionId("");
      setSelectedMessageId("");
      setDisconnecting(null);
      toast.success("Mailbox disconnected and its access token was cleared");
    } catch {
      toast.error("Could not disconnect the mailbox");
    }
  };

  const downloadAttachment = async (attachmentId: string) => {
    if (!selectedConnection || !selectedMessageId) return;
    try {
      await download.mutateAsync({
        tenantMailboxConnectionId: selectedConnection.tenantMailboxConnectionId,
        messageId: selectedMessageId,
        attachmentId,
      });
      toast.success("Attachment downloaded. You can now add the bill manually.");
    } catch {
      toast.error("Could not download this attachment");
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <section className="flex flex-col gap-4 border-b border-black/[0.07] pb-5 pt-1 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Button variant="ghost" size="sm" onClick={() => router.push("/bill-pay")} className="mb-3 -ml-2 text-[#68726d] hover:text-[#10231d]">
            <ArrowLeft className="size-4" /> Back to Bill Pay
          </Button>
          <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#10231d] md:text-[28px]">Tenant mailboxes</h1>
          <p className="mt-2 text-sm leading-5 text-[#718079]">
            Connect a tenant-owned Gmail mailbox to view vendor emails on demand. Villeto does not forward, store, or automatically process the email contents.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={effectiveEntityId} onValueChange={setSelectedEntityId}>
            <SelectTrigger className="h-10! w-full rounded-[10px] border-black/[0.08] bg-white px-3 shadow-none sm:w-72">
              <SelectValue placeholder="Select legal entity" />
            </SelectTrigger>
            <SelectContent className="rounded-[10px] border-black/[0.08]">
              {entities.map((entity) => (
                <SelectItem key={entity.legalEntityId} value={entity.legalEntityId} className="rounded-[7px]">
                  {entity.legalName} · {entity.baseCurrency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => connectionsQuery.refetch()} disabled={!effectiveEntityId || connectionsQuery.isFetching} className="size-10 rounded-[10px] border-black/[0.08] bg-white text-[#64716c] shadow-none hover:bg-[#f3f8f6] hover:text-[#087f70]">
            <RefreshCcw className={`size-4 ${connectionsQuery.isFetching ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh mailboxes</span>
          </Button>
          {policies.billPay.canManageMailboxConnections && (
            <Button onClick={connectMailbox} disabled={!effectiveEntityId || startAuthorization.isPending} className="h-10 rounded-[10px] px-4 text-[12px] font-semibold shadow-none">
              {startAuthorization.isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Connect Gmail
            </Button>
          )}
        </div>
      </section>

      {!entitiesQuery.isLoading && entities.length === 0 ? (
        <EmptyState title="No accounting-ready legal entity is available" detail="Activate and complete accounting readiness for a legal entity before connecting a Bill Pay mailbox." />
      ) : !effectiveEntityId ? (
        <EmptyState title="Select a legal entity" detail="Choose the legal entity that owns the mailbox and will own the invoices you create from it." />
      ) : (
        <>
          <section className="rounded-[16px] border border-black/[0.07] bg-white p-5 shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#10231d]">Connected mailboxes</h2>
                <p className="mt-1 text-[13px] text-[#718079]">A Gmail address can be connected once within this company and is assigned to this legal entity.</p>
              </div>
              <ShieldCheck className="size-5 shrink-0 text-[#087f70]" />
            </div>
            {connectionsQuery.isLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-[#718079]"><Loader2 className="size-4 animate-spin" /> Loading mailboxes</div>
            ) : connections.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-black/[0.1] bg-[#f9fbfa] px-4 py-6 text-sm text-[#718079]">
                No mailbox is connected for this legal entity. {policies.billPay.canManageMailboxConnections ? "Connect the accounts-payable Gmail mailbox to begin viewing vendor emails." : "Ask a mailbox manager to connect the tenant mailbox."}
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {connections.map((connection) => (
                  <div key={connection.tenantMailboxConnectionId} className={`rounded-[12px] border p-4 transition-colors ${selectedConnection?.tenantMailboxConnectionId === connection.tenantMailboxConnectionId ? "border-[#087f70] bg-[#f0faf8]" : "border-black/[0.08] bg-white hover:border-[#087f70]/40"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedConnectionId(connection.tenantMailboxConnectionId);
                        setSelectedMessageId("");
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#10231d]">{connection.maskedMailboxAddress}</p>
                          <p className="mt-1 text-[12px] text-[#718079]">Google Gmail · {connection.connectedAt ? `connected ${dateTime(connection.connectedAt)}` : "not authorized yet"}</p>
                        </div>
                        <Badge variant={statusVariant(connection.status)} className="px-2 py-1 text-[10px]">{statusLabel[connection.status]}</Badge>
                      </div>
                      {connection.lastErrorCode && <p className="mt-3 text-[11px] text-[#b35b00]">Action required: reconnect this mailbox.</p>}
                    </button>
                    {policies.billPay.canManageMailboxConnections && connection.status !== "pending_authorization" && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDisconnecting(connection)} className="mt-3 -ml-2 h-7 rounded-[7px] px-2 text-[12px] font-semibold text-[#b6373e] hover:bg-[#fff1f1] hover:text-[#942b30]">
                        <Unplug className="size-3.5" /> Disconnect
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {selectedConnection?.status === "connected" && (
            <section className="grid min-h-[520px] overflow-hidden rounded-[16px] border border-black/[0.07] bg-white shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)] lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.7fr)]">
              <div className="border-b border-black/[0.07] lg:border-r lg:border-b-0">
                <div className="border-b border-black/[0.07] px-5 py-4">
                  <h2 className="text-[15px] font-semibold text-[#10231d]">Messages</h2>
                  <p className="mt-1 text-[12px] text-[#718079]">Read on demand from {selectedConnection.maskedMailboxAddress}</p>
                </div>
                {!policies.billPay.canViewMailboxEmail ? (
                  <div className="p-5 text-sm text-[#718079]">You can see this connection, but you do not have permission to view its email content.</div>
                ) : messagesQuery.isLoading ? (
                  <div className="flex items-center gap-2 p-5 text-sm text-[#718079]"><Loader2 className="size-4 animate-spin" /> Loading messages</div>
                ) : messageSummaries.length === 0 ? (
                  <div className="p-5 text-sm text-[#718079]">No messages were returned from this mailbox.</div>
                ) : (
                  <div className="max-h-[560px] overflow-y-auto">
                    {messageSummaries.map((message) => <MessageRow key={message.messageId} message={message} selected={selectedMessageId === message.messageId} onSelect={() => setSelectedMessageId(message.messageId)} />)}
                    {messagesQuery.hasNextPage && (
                      <div className="p-3"><Button variant="outline" size="sm" className="w-full rounded-[9px]" disabled={messagesQuery.isFetchingNextPage} onClick={() => messagesQuery.fetchNextPage()}>{messagesQuery.isFetchingNextPage ? <Loader2 className="size-3.5 animate-spin" /> : null} Load more</Button></div>
                    )}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                {!selectedMessageId ? (
                  <div className="flex h-full min-h-[330px] flex-col items-center justify-center px-6 text-center"><Eye className="size-8 text-[#9aaba3]" /><h3 className="mt-4 text-sm font-semibold text-[#10231d]">Select a message to view it</h3><p className="mt-2 max-w-sm text-[13px] leading-5 text-[#718079]">Villeto displays safe plaintext only. The message is not stored in your Bill Pay records.</p></div>
                ) : selectedMessage.isLoading ? (
                  <div className="flex h-full min-h-[330px] items-center justify-center gap-2 text-sm text-[#718079]"><Loader2 className="size-4 animate-spin" /> Loading message</div>
                ) : selectedMessage.data ? (
                  <article className="flex h-full min-h-[430px] flex-col">
                    <header className="border-b border-black/[0.07] px-5 py-4"><h2 className="text-[17px] font-semibold text-[#10231d]">{selectedMessage.data.subject || "No subject"}</h2><dl className="mt-3 grid gap-1 text-[12px] text-[#718079]"><div><dt className="inline font-semibold text-[#53635c]">From:</dt> <dd className="inline">{selectedMessage.data.from || "Unknown sender"}</dd></div><div><dt className="inline font-semibold text-[#53635c]">Received:</dt> <dd className="inline">{dateTime(selectedMessage.data.receivedAt)}</dd></div></dl></header>
                    <div className="flex-1 whitespace-pre-wrap px-5 py-5 text-sm leading-6 text-[#34443c]">{selectedMessage.data.body || "This message has no readable text body."}</div>
                    <footer className="border-t border-black/[0.07] bg-[#fbfcfb] px-5 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[12px] font-semibold text-[#10231d]">Attachments</p><p className="mt-1 text-[11px] text-[#718079]">Downloads are not imported automatically.</p></div><Button variant="outline" size="sm" className="rounded-[9px]" onClick={() => router.push("/bill-pay/add")}>Add bill manually</Button></div>
                      {selectedMessage.data.attachments.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{selectedMessage.data.attachments.map((attachment) => <Button key={attachment.attachmentId} variant="outline" size="sm" className="max-w-full rounded-[9px]" disabled={download.isPending} onClick={() => downloadAttachment(attachment.attachmentId)}><Download className="size-3.5" /><span className="max-w-52 truncate">{attachment.filename}</span></Button>)}</div> : <p className="mt-3 text-[12px] text-[#718079]">No attachments.</p>}
                    </footer>
                  </article>
                ) : <div className="p-5 text-sm text-[#b6373e]">The selected message could not be loaded.</div>}
              </div>
            </section>
          )}
        </>
      )}

      <ConfirmDialog open={Boolean(disconnecting)} onOpenChange={(open) => !open && setDisconnecting(null)} title="Disconnect this mailbox?" description="Villeto will clear its stored access token. Vendor emails remain in the tenant mailbox." confirmText="Disconnect" variant="destructive" onConfirm={disconnectMailbox} />
    </div>
  );
}

function MessageRow({ message, selected, onSelect }: { message: MailboxMessageSummary; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className={`block w-full border-b border-black/[0.06] px-5 py-4 text-left transition-colors ${selected ? "bg-[#f0faf8]" : "hover:bg-[#f8faf9]"}`}><p className="truncate text-[12px] font-semibold text-[#52605b]">{message.from || "Unknown sender"}</p><p className="mt-1 truncate text-[13px] font-semibold text-[#10231d]">{message.subject || "No subject"}</p><p className="mt-1 text-[11px] text-[#84908a]">{dateTime(message.receivedAt)}</p></button>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <section className="flex min-h-72 flex-col items-center justify-center rounded-[16px] border border-dashed border-black/[0.12] bg-white px-6 text-center"><Inbox className="size-9 text-[#9aaba3]" /><h2 className="mt-4 text-base font-semibold text-[#10231d]">{title}</h2><p className="mt-2 max-w-md text-sm leading-5 text-[#718079]">{detail}</p></section>;
}

export default withPermissions(MailboxPage, [
  { resource: "bill_pay.mailbox_connection", action: "view" },
  { resource: "bill_pay.mailbox_connection", action: "manage" },
]);
