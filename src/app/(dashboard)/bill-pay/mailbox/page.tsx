"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Filter,
  GripVertical,
  Inbox,
  Loader2,
  Mail,
  Maximize2,
  Minimize2,
  Move,
  Paperclip,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Unplug,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Rnd } from "react-rnd";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { useEligibleLegalEntities, useLegalEntities } from "@/queries/legal-entities";
import { useCreateBillPayIntake } from "@/queries/bill-pay";
import BillLineItemBatchModal from "@/components/bill-pay/BillLineItemBatchModal";
import {
  MailboxMessageSummary,
  TenantMailboxConnection,
  useDownloadTenantMailboxAttachment,
  useViewTenantMailboxAttachment,
  useTenantMailboxConnections,
  useTenantMailboxMessage,
  useTenantMailboxMessages,
} from "@/queries/bill-pay-mailboxes";

// Dynamically import the PDF viewer so pdfjs is only loaded when needed
const PdfViewer = dynamic(() => import("@/components/ui/pdf-viewer"), { ssr: false });

/* ───────────────────────── helpers ───────────────────────── */

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

function senderDisplayName(from: string | null) {
  if (!from) return "Unknown";
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : from.split("@")[0];
}

const BILL_KEYWORDS = [
  "invoice", "payment", "receipt", "bill", "statement", "remittance",
  "purchase order", "po ", "amount due", "overdue", "balance",
  "quotation", "quote", "proforma", "debit note", "credit note",
];

function isLikelyBillEmail(msg: MailboxMessageSummary): boolean {
  const text = `${msg.subject || ""} ${msg.from || ""}`.toLowerCase();
  return BILL_KEYWORDS.some((kw) => text.includes(kw));
}

/* ───────────────────────── resizable divider hook ───────────────────────── */

function useResizableDivider(initialWidth: number, minWidth: number, maxWidth: number) {
  const [width, setWidth] = useState(initialWidth);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      // Dragging left = make the bill panel wider (since it's on the right)
      const delta = startX.current - ev.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [width, minWidth, maxWidth]);

  return { width, onMouseDown };
}

/* ───────────────────────── main page ───────────────────────── */

function MailboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const policies = useAuthorizationPolicies();

  /* ---------- entity + connection selection ---------- */
  const entitiesQuery = useEligibleLegalEntities("accounting");
  const entities = entitiesQuery.data || [];
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState("");

  /* ---------- filtering ---------- */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBillsOnly, setFilterBillsOnly] = useState(false);

  const effectiveEntityId =
    selectedEntityId ||
    entities.find((e) => e.isDefault)?.legalEntityId ||
    (entities.length === 1 ? entities[0].legalEntityId : "");

  /* ---------- connections ---------- */
  const connectionsQuery = useTenantMailboxConnections(effectiveEntityId || undefined);
  const connections = connectionsQuery.data?.data || [];
  const selectedConnection =
    connections.find((c) => c.tenantMailboxConnectionId === selectedConnectionId) ||
    connections.find((c) => c.status === "connected") ||
    null;

  /* ---------- messages ---------- */
  const messagesQuery = useTenantMailboxMessages(
    policies.billPay.canViewMailboxEmail && selectedConnection?.status === "connected"
      ? selectedConnection.tenantMailboxConnectionId
      : undefined,
  );
  const allMessages = useMemo(
    () => messagesQuery.data?.pages.flatMap((p) => p.messages) || [],
    [messagesQuery.data],
  );

  const messageSummaries = useMemo(() => {
    let filtered = allMessages;
    if (filterBillsOnly) filtered = filtered.filter(isLikelyBillEmail);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) => (m.subject || "").toLowerCase().includes(q) || (m.from || "").toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [allMessages, filterBillsOnly, searchTerm]);

  const selectedMessage = useTenantMailboxMessage(
    selectedConnection?.tenantMailboxConnectionId,
    selectedMessageId || undefined,
  );

  /* ---------- mutations ---------- */
  const downloadAttachment = useDownloadTenantMailboxAttachment();
  const viewAttachment = useViewTenantMailboxAttachment();

  /* ---------- floating attachment viewer ---------- */
  const [attachmentViewer, setAttachmentViewer] = useState<{ url: string; filename: string; mimeType: string } | null>(null);

  const openAttachmentViewer = async (attachmentId: string, filename: string, mimeType: string) => {
    if (!selectedConnection || !selectedMessageId) return;
    // Revoke old URL if still open
    if (attachmentViewer?.url) URL.revokeObjectURL(attachmentViewer.url);
    try {
      const result = await viewAttachment.mutateAsync({
        tenantMailboxConnectionId: selectedConnection.tenantMailboxConnectionId,
        messageId: selectedMessageId,
        attachmentId,
        filename,
        mimeType,
      });
      setAttachmentViewer(result);
    } catch {
      toast.error("Could not open this attachment");
    }
  };

  const closeAttachmentViewer = useCallback(() => {
    if (attachmentViewer?.url) URL.revokeObjectURL(attachmentViewer.url);
    setAttachmentViewer(null);
  }, [attachmentViewer]);

  /* ---------- inline bill creation state ---------- */
  const [billPanelOpen, setBillPanelOpen] = useState(false);
  const [billStep, setBillStep] = useState(1);
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>();
  const [dueDate, setDueDate] = useState<Date>();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [isLineItemModalOpen, setIsLineItemModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryBank, setBeneficiaryBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [sortCode, setSortCode] = useState("");

  const createIntake = useCreateBillPayIntake();
  const { data: legalEntitiesData } = useLegalEntities();
  const legalEntityId = legalEntitiesData?.data?.[0]?.legalEntityId || "";

  /* ---------- resizable bill panel ---------- */
  const billPanelResize = useResizableDivider(420, 340, 600);

  const resetBillForm = useCallback(() => {
    setBillStep(1);
    setVendorName("");
    setDescription("");
    setInvoiceDate(undefined);
    setDueDate(undefined);
    setAmount("");
    setCurrency("NGN");
    setPurchaseOrder("");
    setAttachment(null);
    setLineItems([]);
    setPaymentMethod("bank_transfer");
    setBeneficiaryName("");
    setBeneficiaryBank("");
    setAccountNumber("");
    setSortCode("");
  }, []);

  const openBillPanel = useCallback(() => {
    resetBillForm();
    if (selectedMessage.data) {
      setVendorName(senderDisplayName(selectedMessage.data.from));
      setDescription(selectedMessage.data.subject || "");
      if (selectedMessage.data.receivedAt) {
        setInvoiceDate(new Date(selectedMessage.data.receivedAt));
      }
    }
    setBillPanelOpen(true);
  }, [resetBillForm, selectedMessage.data]);

  const closeBillPanel = useCallback(() => {
    setBillPanelOpen(false);
  }, []);

  /* ---------- drag-and-drop for attachment ---------- */
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) setAttachment(e.dataTransfer.files[0]);
  };

  /* ---------- OAuth callback handling ---------- */
  useEffect(() => {
    const oauth = searchParams.get("oauth");
    if (!oauth) return;
    if (oauth === "connected") toast.success("Gmail mailbox connected");
    else toast.error("Gmail authorization was not completed");
    router.replace("/bill-pay/mailbox");
  }, [router, searchParams]);



  const handleDownloadAttachment = async (attachmentId: string) => {
    const message = selectedMessage.data;
    const attachment = message?.attachments.find((item) => item.attachmentId === attachmentId);
    if (!selectedConnection || !message || !attachment) return;
    try {
      await downloadAttachment.mutateAsync({
        tenantMailboxConnectionId: selectedConnection.tenantMailboxConnectionId,
        messageId: message.messageId,
        attachmentId: attachment.attachmentId,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
      });
      toast.success("Attachment downloaded");
    } catch {
      toast.error("Could not download this attachment");
    }
  };

  const handleSubmitBill = async () => {
    try {
      await createIntake.mutateAsync({
        legalEntityId,
        source: "manual_entry",
        externalReference: vendorName,
        senderType: "user",
        senderName: "User",
        senderEmail: "user@example.com",
        messageSubject: `Invoice from ${vendorName}`,
        messageBody: description,
        structuredInput: {
          vendorName,
          purchaseDescription: description,
          amount,
          currency,
          purchaseOrder,
          lineItems,
          paymentMethod,
          beneficiaryName,
          beneficiaryBank,
          accountNumber,
          sortCode,
          invoiceDate,
          dueDate,
          ...(selectedMessageId && selectedConnection && {
            sourceMailboxConnectionId: selectedConnection.tenantMailboxConnectionId,
            sourceMessageId: selectedMessageId,
          }),
        },
      });
      toast.success("Bill submitted successfully");
      closeBillPanel();
    } catch {
      toast.error("Failed to submit bill");
    }
  };

  /* ───────────────────────── render ───────────────────────── */

  const showMessagePane = selectedConnection?.status === "connected";

  return (
    <div className="-m-3 sm:-m-5 lg:-m-6 flex flex-col" style={{ height: "calc(100vh - 72px)" }}>
      {/* ── top bar ── */}
      <header className="flex shrink-0 flex-col gap-3 border-b border-black/[0.07] bg-white/80 backdrop-blur-sm px-4 pb-4 pt-4 lg:flex-row lg:items-center lg:justify-between sm:px-6">
        <div className="flex items-center gap-3">

          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#10231d] md:text-[22px]">Mailbox</h1>
            <p className="text-[12px] text-[#718079]">Read vendor emails on demand and create bills from them.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={effectiveEntityId} onValueChange={setSelectedEntityId}>
            <SelectTrigger className="h-9 w-full rounded-[9px] border-black/[0.08] bg-white px-3 text-[12px] shadow-none sm:w-56">
              <SelectValue placeholder="Select entity" />
            </SelectTrigger>
            <SelectContent className="rounded-[10px] border-black/[0.08]">
              {entities.map((entity) => (
                <SelectItem key={entity.legalEntityId} value={entity.legalEntityId} className="rounded-[7px] text-[12px]">
                  {entity.legalName} · {entity.baseCurrency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Connection Selector */}
          <Select value={selectedConnectionId} onValueChange={(val) => {
            setSelectedConnectionId(val);
            setSelectedMessageId("");
            closeBillPanel();
          }}>
            <SelectTrigger className="h-9 w-full rounded-[9px] border-black/[0.08] bg-white px-3 text-[12px] shadow-none sm:w-56" disabled={connections.length === 0}>
              <SelectValue placeholder="Select mailbox" />
            </SelectTrigger>
            <SelectContent className="rounded-[10px] border-black/[0.08]">
              {connections.map((conn) => (
                <SelectItem key={conn.tenantMailboxConnectionId} value={conn.tenantMailboxConnectionId} className="rounded-[7px] text-[12px]">
                  {conn.maskedMailboxAddress}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => connectionsQuery.refetch()} disabled={!effectiveEntityId || connectionsQuery.isFetching} className="size-9 rounded-[9px] border-black/[0.08] bg-white text-[#64716c] shadow-none hover:bg-[#f3f8f6] hover:text-[#087f70]">
            <RefreshCcw className={`size-3.5 ${connectionsQuery.isFetching ? "animate-spin" : ""}`} />
          </Button>

          {policies.billPay.canManageMailboxConnections && (
            <Button onClick={() => router.push("/bill-pay/settings?tab=mailboxes")} variant="outline" className="h-9 rounded-[9px] px-3.5 text-[11px] font-semibold shadow-none border-black/[0.08] text-[#64716c]">
              <ShieldCheck className="size-3.5 mr-2" />
              Manage Settings
            </Button>
          )}
        </div>
      </header>

      {/* ── entity guards ── */}
      {!entitiesQuery.isLoading && entities.length === 0 ? (
        <EmptyState title="No accounting-ready entity" detail="Activate accounting readiness for a legal entity before connecting a mailbox." />
      ) : !effectiveEntityId ? (
        <EmptyState title="Select a legal entity" detail="Choose the entity that owns the mailbox." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">


          {/* ── 3-pane area ── */}
          {showMessagePane ? (
            <div className="flex min-h-0 flex-1 relative">
              {/* ─── Left: message list ─── */}
              <div className={`flex shrink-0 flex-col border-r border-black/[0.07] bg-white transition-all ${billPanelOpen ? "w-[220px]" : "w-[280px] lg:w-[320px]"}`}>
                <div className="shrink-0 border-b border-black/[0.07] px-3 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[13px] font-semibold text-[#10231d]">Messages</h2>
                      <p className="mt-0.5 truncate text-[10px] text-[#718079]">{selectedConnection?.maskedMailboxAddress}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFilterBillsOnly((v) => !v)}
                      title={filterBillsOnly ? "Showing bill-related only — click to show all" : "Click to show bill-related emails only"}
                      className={`flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-semibold transition-colors ${
                        filterBillsOnly
                          ? "bg-[#087f70] text-white"
                          : "bg-[#f5f8f7] text-[#68726d] hover:bg-[#e8f0ed] hover:text-[#10231d]"
                      }`}
                    >
                      <Filter className="size-3" />
                      Bills
                    </button>
                  </div>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#84908a]" />
                    <Input
                      placeholder="Search sender or subject…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8 rounded-[7px] border-black/[0.08] bg-[#f9faf9] pl-8 text-[11px] shadow-none placeholder:text-[#a4b0aa]"
                    />
                  </div>
                </div>

                {!policies.billPay.canViewMailboxEmail ? (
                  <div className="p-4 text-[12px] text-[#718079]">You don't have permission to view email content.</div>
                ) : messagesQuery.isLoading ? (
                  <div className="flex items-center gap-2 p-4 text-[12px] text-[#718079]"><Loader2 className="size-3.5 animate-spin" /> Loading…</div>
                ) : messageSummaries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
                    <Search className="size-5 text-[#b0bbb5] mb-2" />
                    <p className="text-[12px] text-[#718079]">
                      {allMessages.length > 0 && (searchTerm || filterBillsOnly) ? "No emails match your filter." : "No messages returned."}
                    </p>
                    {(searchTerm || filterBillsOnly) && (
                      <button type="button" onClick={() => { setSearchTerm(""); setFilterBillsOnly(false); }} className="mt-2 text-[11px] font-semibold text-[#087f70] hover:text-[#076b5e]">
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {messageSummaries.map((msg) => (
                      <button
                        key={msg.messageId}
                        type="button"
                        onClick={() => { setSelectedMessageId(msg.messageId); closeBillPanel(); closeAttachmentViewer(); }}
                        className={`block w-full border-b border-black/[0.05] px-3 py-3 text-left transition-colors ${
                          selectedMessageId === msg.messageId ? "bg-[#f0faf8]" : "hover:bg-[#f8faf9]"
                        }`}
                      >
                        <p className="truncate text-[11px] font-semibold text-[#52605b]">{msg.from || "Unknown"}</p>
                        <p className="mt-0.5 truncate text-[12px] font-semibold text-[#10231d]">{msg.subject || "No subject"}</p>
                        <p className="mt-0.5 text-[10px] text-[#84908a]">{dateTime(msg.receivedAt)}</p>
                      </button>
                    ))}
                    {messagesQuery.hasNextPage && (
                      <div className="p-2">
                        <Button variant="outline" size="sm" className="w-full rounded-[8px] text-[11px]" disabled={messagesQuery.isFetchingNextPage} onClick={() => messagesQuery.fetchNextPage()}>
                          {messagesQuery.isFetchingNextPage ? <Loader2 className="size-3 animate-spin" /> : null}
                          Load more
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── Middle: email viewer ─── */}
              <div className="flex min-w-0 flex-1 flex-col bg-[#f4f7f5]">
                {!selectedMessageId ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-[#eef2f0]">
                      <Eye className="size-6 text-[#9aaba3]" />
                    </div>
                    <h3 className="mt-4 text-[13px] font-semibold text-[#10231d]">Select a message</h3>
                    <p className="mt-1.5 max-w-xs text-[12px] leading-4 text-[#718079]">
                      Click an email on the left to view its contents. You can then create a bill directly from it.
                    </p>
                  </div>
                ) : selectedMessage.isLoading ? (
                  <div className="flex flex-1 items-center justify-center gap-2 text-[12px] text-[#718079]">
                    <Loader2 className="size-4 animate-spin" /> Loading message…
                  </div>
                ) : selectedMessage.data ? (
                  <div className="flex flex-1 flex-col min-h-0">
                    {/* email header */}
                    <div className="shrink-0 border-b border-black/[0.07] bg-white px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-[16px] font-semibold text-[#10231d]">{selectedMessage.data.subject || "No subject"}</h2>
                          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#718079]">
                            <div><dt className="inline font-semibold text-[#53635c]">From:</dt> <dd className="inline">{selectedMessage.data.from || "Unknown"}</dd></div>
                            <div><dt className="inline font-semibold text-[#53635c]">Received:</dt> <dd className="inline">{dateTime(selectedMessage.data.receivedAt)}</dd></div>
                            {selectedMessage.data.to && <div><dt className="inline font-semibold text-[#53635c]">To:</dt> <dd className="inline">{selectedMessage.data.to}</dd></div>}
                          </dl>
                        </div>
                        {!billPanelOpen && (
                          <Button onClick={openBillPanel} className="shrink-0 h-8 rounded-[8px] px-3 text-[11px] font-semibold shadow-none bg-[#087f70] hover:bg-[#076b5e] text-white">
                            <Plus className="size-3.5" /> Create bill
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* email body */}
                    <div className="flex-1 overflow-y-auto px-5 py-4">
                      <div className="whitespace-pre-wrap text-[13px] leading-6 text-[#34443c]">
                        {selectedMessage.data.body || "This message has no readable text body."}
                      </div>
                    </div>

                    {/* attachments bar */}
                    <div className="shrink-0 border-t border-black/[0.07] bg-white px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Paperclip className="size-3.5 text-[#84908a]" />
                          <span className="text-[11px] font-semibold text-[#10231d]">
                            {selectedMessage.data.attachments.length} attachment{selectedMessage.data.attachments.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      {selectedMessage.data.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedMessage.data.attachments.map((att) => (
                            <div key={att.attachmentId} className="flex items-center gap-1.5 rounded-[8px] border border-black/[0.06] bg-[#f9faf9] px-2.5 py-1.5">
                              <FileText className="size-3.5 text-[#087f70]" />
                              <span className="max-w-[140px] truncate text-[11px] font-medium text-[#10231d]">{att.filename}</span>
                              <div className="flex items-center gap-0.5">
                                {/* View inline */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-[#087f70] hover:bg-[#f0faf8]"
                                  disabled={viewAttachment.isPending}
                                  onClick={() => openAttachmentViewer(att.attachmentId, att.filename, att.mimeType)}
                                  title="View"
                                >
                                  <Eye className="size-3" />
                                </Button>
                                {/* Download */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 text-[#64716c] hover:text-[#087f70]"
                                  disabled={downloadAttachment.isPending}
                                  onClick={() => handleDownloadAttachment(att.attachmentId)}
                                  title="Download"
                                >
                                  <Download className="size-3" />
                                </Button>
                                {/* Attach to bill */}
                                {billPanelOpen && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 text-[#087f70] hover:bg-[#f0faf8]"
                                    onClick={() => {
                                      const placeholderFile = new File([], att.filename, { type: att.mimeType });
                                      setAttachment(placeholderFile);
                                      toast.success(`"${att.filename}" attached to bill`);
                                    }}
                                    title="Attach to bill"
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-5 text-[12px] text-[#b6373e]">
                    This message could not be loaded.
                  </div>
                )}
              </div>

              {/* ─── Resize handle ─── */}
              {billPanelOpen && (
                <div
                  onMouseDown={billPanelResize.onMouseDown}
                  className="shrink-0 w-[5px] cursor-col-resize bg-transparent hover:bg-[#087f70]/10 active:bg-[#087f70]/20 transition-colors flex items-center justify-center group z-10"
                  title="Drag to resize"
                >
                  <GripVertical className="size-3.5 text-[#b0bbb5] group-hover:text-[#087f70] transition-colors" />
                </div>
              )}

              {/* ─── Right: inline Add Bill panel (resizable) ─── */}
              {billPanelOpen && (
                <div className="flex shrink-0 flex-col border-l border-black/[0.07] bg-white" style={{ width: billPanelResize.width }}>
                  {/* panel header */}
                  <div className="flex shrink-0 items-center justify-between border-b border-black/[0.07] px-5 py-4">
                    <div>
                      <h3 className="text-[18px] font-bold text-[#10231d]">
                        {billStep === 1 ? "Billing Information" : billStep === 2 ? "Line Items" : "Payment Details"}
                      </h3>
                      <p className="mt-0.5 text-[12px] text-[#68726d]">From email — step {billStep} of 3</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={closeBillPanel} className="size-8 rounded-[8px] text-[#68726d] hover:text-[#10231d]">
                      <X className="size-4" />
                    </Button>
                  </div>

                  {/* panel stepper */}
                  <div className="shrink-0 flex items-center gap-3 border-b border-black/[0.05] px-5 py-3 bg-[#f9faf9]">
                    {[
                      { n: 1, label: "Billing Information" },
                      { n: 2, label: "Line Items" },
                      { n: 3, label: "Payment Details" },
                    ].map(({ n, label }) => (
                      <div key={n} className="flex items-center gap-2">
                        <div className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                          billStep === n ? "bg-[#087f70] text-white" : billStep > n ? "bg-[#e8f8f5] text-[#087f70]" : "bg-black/[0.06] text-[#68726d]"
                        }`}>
                          {n}
                        </div>
                        <span className={`text-[12px] ${billStep === n ? "text-[#0b100e] font-medium" : "text-[#68726d]"}`}>
                          {label}
                        </span>
                        {n < 3 && <div className="h-px w-6 bg-black/[0.06]" />}
                      </div>
                    ))}
                  </div>

                  {/* panel content */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-5">
                      {billStep === 1 && (
                        <div className="space-y-4">
                          {/* attachment indicator */}
                          {attachment && (
                            <div className="flex items-center gap-2 rounded-[8px] border border-[#087f70]/20 bg-[#f0faf8] px-3 py-2.5">
                              <FileText className="size-4 text-[#087f70]" />
                              <span className="flex-1 truncate text-[13px] font-medium text-[#10231d]">{attachment.name}</span>
                              <button type="button" onClick={() => setAttachment(null)} className="text-[#84908a] hover:text-[#b6373e]">
                                <X className="size-3.5" />
                              </button>
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#10231d]">Invoice Date</label>
                            <DatePicker date={invoiceDate} setDate={setInvoiceDate} className="rounded-[8px] border-black/[0.08] text-[13px]" />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#10231d]">Vendor Name</label>
                            <Input placeholder="e.g. Acme Corp" value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#10231d]">Purchase Description</label>
                            <Input placeholder="e.g. Office supplies" value={description} onChange={(e) => setDescription(e.target.value)} className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[13px] font-medium text-[#10231d]">Amount</label>
                              <div className="flex h-10 rounded-[8px] border border-black/[0.08] focus-within:border-black/[0.16] focus-within:ring-1 focus-within:ring-black/[0.08] overflow-hidden bg-white shadow-sm transition-shadow">
                                <Select value={currency} onValueChange={setCurrency}>
                                  <SelectTrigger className="h-full w-[85px] border-0 rounded-none shadow-none focus:ring-0 text-[13px] font-medium bg-[#f9faf9] border-r border-black/[0.08]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="NGN">NGN</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-full border-0 rounded-none shadow-none focus-visible:ring-0 text-[13px] flex-1 bg-transparent" />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[13px] font-medium text-[#10231d]">Due Date</label>
                              <DatePicker date={dueDate} setDate={setDueDate} className="rounded-[8px] border-black/[0.08] text-[13px]" />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#10231d]">Purchase Order (Optional)</label>
                            <Input placeholder="e.g. PO-1234" value={purchaseOrder} onChange={(e) => setPurchaseOrder(e.target.value)} className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" />
                          </div>

                          {/* Drag-and-drop attachment area */}
                          <div className="space-y-1.5">
                            <label htmlFor="bill-attachment-upload" className="text-[13px] font-medium text-[#10231d] cursor-pointer hover:text-[#087f70] transition-colors">Attachment (Optional)</label>
                            <p className="text-[12px] text-[#68726d] mb-2">Attach a document, or use <strong className="text-[#087f70]">+</strong> on an email attachment above.</p>

                            <input type="file" id="bill-attachment-upload" className="hidden" accept=".pdf,image/jpeg,image/png" onChange={(e) => { if (e.target.files?.[0]) setAttachment(e.target.files[0]); }} />

                            <div
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              onClick={() => document.getElementById("bill-attachment-upload")?.click()}
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
                                      <p className="text-[13px] font-medium text-[#10231d] truncate max-w-[180px]">{attachment.name}</p>
                                      <p className="text-[12px] text-[#68726d]">{attachment.size ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB` : "From email"}</p>
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
                                onClick={(e) => { e.stopPropagation(); document.getElementById("bill-attachment-upload")?.click(); }}
                                className="text-[#087f70] border-[#087f70]/30 h-8 text-xs font-medium bg-white hover:bg-[#f0faf8] hover:text-[#076b5e]"
                              >
                                {attachment ? "Replace" : "Upload"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {billStep === 2 && (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <h2 className="text-[16px] font-bold text-[#10231d]">Request Items</h2>
                            <div className="text-[13px] font-medium text-[#68726d]">Total: <span className="font-bold text-[#10231d]">₦{lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0).toLocaleString()}</span></div>
                          </div>

                          <BillLineItemBatchModal
                            open={isLineItemModalOpen}
                            onClose={() => setIsLineItemModalOpen(false)}
                            onSaveAll={async (items) => { setLineItems((prev) => [...prev, ...items]); setIsLineItemModalOpen(false); }}
                            saving={false}
                            currency="NGN"
                            persistKey="mailbox_bill_draft"
                          />

                          <div className="border border-black/[0.08] rounded-[10px] bg-white overflow-hidden">
                            {lineItems.length === 0 ? (
                              <div className="text-center py-10 bg-[#f9faf9]">
                                <p className="text-[13px] text-[#68726d] mb-4">You have no line items.</p>
                                <Button onClick={() => setIsLineItemModalOpen(true)} className="bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-9 text-[13px] font-semibold">
                                  Add Line Items
                                </Button>
                              </div>
                            ) : (
                              <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-[14px] font-bold text-[#10231d]">Items</h3>
                                    <span className="flex items-center justify-center bg-[#f9faf9] border border-black/[0.08] text-[#10231d] text-[11px] font-bold rounded-full w-5 h-5">{lineItems.length}</span>
                                  </div>
                                  <button onClick={() => setIsLineItemModalOpen(true)} className="flex items-center gap-1.5 text-[13px] font-semibold text-[#087f70] hover:text-[#076b5e] transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Add Item(s)
                                  </button>
                                </div>
                                <div className="space-y-1">
                                  {lineItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center px-3 py-3 border-b border-black/[0.04] last:border-0 hover:bg-[#f9faf9]/50 transition-colors rounded-[6px]">
                                      <div className="flex-1 text-[13px] font-bold text-[#10231d]">{item.description}</div>
                                      <div className="w-16 text-[13px] font-semibold text-[#10231d]">{item.quantity}</div>
                                      <div className="w-24 text-[13px] font-medium text-[#68726d]">{item.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</div>
                                      <button onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== idx))} className="text-[#d33d44] hover:text-red-700 transition-colors p-1 ml-2">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {billStep === 3 && (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#10231d]">Payment Method</label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                              <SelectTrigger className="h-10 rounded-[8px] border-black/[0.08] text-[13px]"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#10231d]">Beneficiary Name</label>
                            <Input placeholder="Acme Corp" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#10231d]">Beneficiary Bank</label>
                            <Input placeholder="Ocean bank" value={beneficiaryBank} onChange={(e) => setBeneficiaryBank(e.target.value)} className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#10231d]">Account Number</label>
                            <Input placeholder="123-43535-53523" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[#10231d]">Sort Code (Optional)</label>
                            <Input placeholder="e.g. 057-XXXXXX" value={sortCode} onChange={(e) => setSortCode(e.target.value)} className="h-10 rounded-[8px] border-black/[0.08] text-[13px]" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* panel footer */}
                  <div className="shrink-0 border-t border-black/[0.06] px-5 py-4">
                    <div className="flex justify-end gap-3">
                      {billStep > 1 ? (
                        <Button variant="outline" onClick={() => setBillStep((s) => s - 1)} className="w-28 h-10 text-[#52605b] border-black/[0.08] rounded-[8px] font-semibold text-[13px] hover:bg-[#f9faf9]">Back</Button>
                      ) : (
                        <Button variant="outline" onClick={closeBillPanel} className="w-28 h-10 text-[#52605b] border-black/[0.08] rounded-[8px] font-semibold text-[13px] hover:bg-[#f9faf9]">Cancel</Button>
                      )}
                      {billStep < 3 ? (
                        <Button onClick={() => setBillStep((s) => s + 1)} disabled={billStep === 1 && (!vendorName.trim() || !description.trim())} className="w-28 h-10 bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] font-semibold text-[13px]">Continue</Button>
                      ) : (
                        <Button onClick={handleSubmitBill} disabled={!beneficiaryName.trim() || !accountNumber.trim() || createIntake.isPending} className="w-40 h-10 bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] font-semibold text-[13px]">
                          {createIntake.isPending ? "Submitting…" : "Submit for Approval"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Floating attachment viewer (react-rnd) ─── */}
              {attachmentViewer && (
                <Rnd
                  default={{
                    x: 100,
                    y: 60,
                    width: 520,
                    height: 500,
                  }}
                  minWidth={320}
                  minHeight={240}
                  bounds="parent"
                  dragHandleClassName="rnd-drag-handle"
                  style={{ zIndex: 50 }}
                  className="absolute"
                >
                  <div className="flex flex-col h-full w-full rounded-[12px] border border-black/[0.1] bg-white shadow-xl overflow-hidden">
                    {/* viewer header — this is the drag handle */}
                    <div className="rnd-drag-handle flex shrink-0 items-center justify-between border-b border-black/[0.07] bg-[#f9faf9] px-4 py-2.5 cursor-move select-none">
                      <div className="flex items-center gap-2 min-w-0">
                        <Move className="size-3.5 text-[#84908a] shrink-0" />
                        <FileText className="size-3.5 text-[#087f70] shrink-0" />
                        <span className="truncate text-[12px] font-semibold text-[#10231d]">{attachmentViewer.filename}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-[#64716c] hover:text-[#087f70]"
                          onClick={() => {
                            // Open in new tab
                            window.open(attachmentViewer.url, "_blank");
                          }}
                          title="Open in new tab"
                        >
                          <ExternalLink className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-[#64716c] hover:text-[#b6373e]"
                          onClick={closeAttachmentViewer}
                          title="Close"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* viewer content */}
                    <div className="flex-1 overflow-auto bg-[#f5f7f6]">
                      {attachmentViewer.mimeType === "application/pdf" || attachmentViewer.filename.toLowerCase().endsWith(".pdf") ? (
                        <PdfViewer url={attachmentViewer.url} />
                      ) : attachmentViewer.mimeType.startsWith("image/") || attachmentViewer.filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <div className="flex items-center justify-center p-4 h-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachmentViewer.url}
                            alt={attachmentViewer.filename}
                            className="max-w-full max-h-full object-contain rounded-[6px] shadow-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                          <FileText className="size-10 text-[#b0bbb5]" />
                          <p className="text-[13px] font-medium text-[#10231d]">{attachmentViewer.filename}</p>
                          <p className="text-[12px] text-[#718079]">This file type can't be previewed inline.</p>
                          <Button variant="outline" size="sm" onClick={() => window.open(attachmentViewer.url, "_blank")} className="mt-2 text-[12px]">
                            <ExternalLink className="size-3.5 mr-1.5" /> Open in new tab
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* resize hint */}
                    <div className="shrink-0 flex items-center justify-center py-1 bg-[#f9faf9] border-t border-black/[0.05]">
                      <span className="text-[9px] text-[#b0bbb5]">Drag corners to resize • Drag header to move</span>
                    </div>
                  </div>
                </Rnd>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-[#f5f8f7]">
                <Mail className="size-6 text-[#9aaba3]" />
              </div>
              <h3 className="mt-4 text-[13px] font-semibold text-[#10231d]">
                {connections.length === 0 ? "No mailboxes connected" : "Select a mailbox"}
              </h3>
              <p className="mt-1.5 max-w-sm text-[12px] text-[#718079]">
                {connections.length === 0 
                  ? "Go to settings to connect an accounts-payable Gmail."
                  : "Select a mailbox from the top right dropdown to view its messages."}
              </p>
              {connections.length === 0 && (
                <Button onClick={() => router.push("/bill-pay/settings?tab=mailboxes")} className="mt-4 bg-[#087f70] hover:bg-[#076b5e] text-white h-9 rounded-[8px] px-4 text-[12px] font-semibold shadow-none">
                  Go to Settings
                </Button>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

/* ───────────────────────── sub-components ───────────────────────── */

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-[#f5f8f7]">
        <Inbox className="size-6 text-[#9aaba3]" />
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-[#10231d]">{title}</h2>
      <p className="mt-1.5 max-w-sm text-[12px] leading-4 text-[#718079]">{detail}</p>
    </div>
  );
}

export default withPermissions(MailboxPage, [
  { resource: "bill_pay.mailbox_connection", action: "view" },
  { resource: "bill_pay.mailbox_connection", action: "manage" },
]);
