import { useState } from "react";
import { Loader2, Mail, RefreshCcw, ShieldCheck, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import {
  TenantMailboxConnection,
  useTenantMailboxConnections,
  useStartGoogleMailboxAuthorization,
  useDisconnectTenantMailbox,
} from "@/queries/bill-pay-mailboxes";
import { getApiErrorMessage } from "@/lib/types/api-error";

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

export function MailboxConnectionsSettings({ legalEntityId }: { legalEntityId: string }) {
  const policies = useAuthorizationPolicies();
  const [disconnecting, setDisconnecting] = useState<TenantMailboxConnection | null>(null);

  const connectionsQuery = useTenantMailboxConnections(legalEntityId);
  const connections = connectionsQuery.data?.data || [];

  const startAuthorization = useStartGoogleMailboxAuthorization();
  const disconnectMailbox = useDisconnectTenantMailbox();

  const connectMailbox = async () => {
    if (!legalEntityId) return;
    try {
      const res = await startAuthorization.mutateAsync({ legalEntityId });
      if (res?.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to start connection process"));
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnecting || !legalEntityId) return;
    try {
      await disconnectMailbox.mutateAsync(disconnecting.tenantMailboxConnectionId);
      toast.success("Mailbox disconnected");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to disconnect mailbox"));
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="bg-white border border-black/[0.07] rounded-[12px] p-6 h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[16px] font-semibold text-[#10231d] flex items-center gap-2">
            <ShieldCheck className="size-5 text-[#087f70]" /> Mailbox Connections
          </h2>
          <p className="text-[13px] text-[#718079] mt-1">
            Connect your accounts-payable Gmail to automatically read vendor emails and create bills.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="icon" onClick={() => connectionsQuery.refetch()} disabled={!legalEntityId || connectionsQuery.isFetching} className="size-9 rounded-[9px] border-black/[0.08] bg-white text-[#64716c] shadow-none hover:bg-[#f3f8f6] hover:text-[#087f70]">
            <RefreshCcw className={`size-3.5 ${connectionsQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>
          {policies.billPay.canManageMailboxConnections && (
            <Button onClick={connectMailbox} disabled={!legalEntityId || startAuthorization.isPending} className="h-9 rounded-[9px] px-3.5 text-[12px] font-semibold shadow-none bg-[#087f70] hover:bg-[#076b5e] text-white">
              {startAuthorization.isPending ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <Mail className="size-3.5 mr-2" />}
              Connect Gmail
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-black/[0.05] pt-6 flex-1 overflow-y-auto min-h-0 pr-2">
        {connectionsQuery.isLoading ? (
          <div className="flex justify-center items-center py-10 text-[13px] text-[#718079] gap-2">
            <Loader2 className="size-4 animate-spin" /> Loading connections...
          </div>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-[#fbfcfb] rounded-[10px] border border-black/[0.04]">
            <Mail className="size-8 text-[#9aaba3] mb-3" />
            <h3 className="text-[14px] font-semibold text-[#10231d]">No mailboxes connected</h3>
            <p className="mt-1 text-[13px] text-[#718079] max-w-sm">
              {policies.billPay.canManageMailboxConnections
                ? "Connect your Gmail account to start importing invoices automatically."
                : "Ask a workspace manager to connect an accounts-payable mailbox."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {connections.map((connection) => (
              <div
                key={connection.tenantMailboxConnectionId}
                className="rounded-[10px] border border-black/[0.08] bg-white p-4 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#10231d]">{connection.maskedMailboxAddress}</p>
                    <p className="mt-1 text-[11px] text-[#718079]">
                      {connection.connectedAt ? `Connected ${dateTime(connection.connectedAt)}` : "Not authorized"}
                    </p>
                  </div>
                  <Badge variant={statusVariant(connection.status)} className="shrink-0 px-2 py-0.5 text-[10px]">
                    {statusLabel[connection.status]}
                  </Badge>
                </div>
                {policies.billPay.canManageMailboxConnections && connection.status !== "pending_authorization" && (
                  <div className="mt-4 pt-4 border-t border-black/[0.04]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDisconnecting(connection)}
                      className="h-8 rounded-[6px] px-2.5 text-[11px] font-semibold text-[#b6373e] hover:bg-[#fff1f1] hover:text-[#942b30] w-full justify-start"
                    >
                      <Unplug className="size-3.5 mr-2" /> Disconnect account
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!disconnecting}
        onOpenChange={(open) => !open && setDisconnecting(null)}
        title="Disconnect Mailbox"
        description={`Are you sure you want to disconnect ${disconnecting?.maskedMailboxAddress}? You will stop receiving automated bills from this email.`}
        confirmText="Disconnect"
        onConfirm={confirmDisconnect}
      />
    </div>
  );
}
