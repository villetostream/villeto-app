import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";

export type TenantMailboxConnectionStatus =
  | "pending_authorization"
  | "connected"
  | "disconnected"
  | "requires_reauthorization"
  | "error";

export interface TenantMailboxConnection {
  tenantMailboxConnectionId: string;
  provider: "google_gmail";
  status: TenantMailboxConnectionStatus;
  maskedMailboxAddress: string;
  sourceLabelId: string | null;
  sourceLabelName: string | null;
  legalEntity: {
    legalEntityId: string;
    code: string;
    legalName: string;
  };
  connectedAt: string | null;
  disconnectedAt: string | null;
  watchExpiresAt: string | null;
  lastErrorCode: string | null;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MailboxMessageSummary {
  messageId: string;
  threadId: string | null;
  from: string | null;
  subject: string | null;
  receivedAt: string | null;
}

export interface MailboxMessage extends MailboxMessageSummary {
  to: string | null;
  cc: string | null;
  body: string;
  attachments: Array<{
    attachmentId: string;
    filename: string;
    mimeType: string;
    size: number | null;
  }>;
}

type PaginationMeta = {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

type Paginated<T> = { data: T[]; meta: PaginationMeta };
type ApiEnvelope<T> = { data: T };

function unwrap<T>(response: ApiEnvelope<T> | T): T {
  return response && typeof response === "object" && "data" in response
    ? (response as ApiEnvelope<T>).data
    : response as T;
}

function filenameFromDisposition(value: string | undefined) {
  const match = value?.match(/filename="?([^";]+)"?/i);
  return match?.[1] || "attachment";
}

export function useTenantMailboxConnections(legalEntityId?: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "mailboxes", legalEntityId],
    queryFn: async () =>
      unwrap<Paginated<TenantMailboxConnection>>(
        (await axios.get("bill-pay/mailbox-connections", {
          params: { legalEntityId, page: 1, limit: 50 },
        })).data,
      ),
    enabled: Boolean(legalEntityId),
  });
}

export function useStartGoogleMailboxAuthorization() {
  const axios = useAxios();
  return useMutation({
    mutationFn: async ({ legalEntityId }: { legalEntityId: string }) =>
      unwrap<{
        tenantMailboxConnectionId: string;
        authorizationUrl: string;
        expiresAt: string;
      }>(
        (await axios.post("bill-pay/mailbox-connections/google/authorize", { legalEntityId })).data,
      ),
  });
}

export function useDisconnectTenantMailbox() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (tenantMailboxConnectionId: string) =>
      unwrap<TenantMailboxConnection>(
        (await axios.delete(`bill-pay/mailbox-connections/${tenantMailboxConnectionId}`)).data,
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["bill-pay", "mailboxes"] }),
  });
}

export function useTenantMailboxMessages(tenantMailboxConnectionId?: string) {
  const axios = useAxios();
  return useInfiniteQuery({
    queryKey: ["bill-pay", "mailboxes", tenantMailboxConnectionId, "messages"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap<{ messages: MailboxMessageSummary[]; nextPageToken: string | null }>(
        (await axios.get(`bill-pay/mailbox-connections/${tenantMailboxConnectionId}/messages`, {
          params: { limit: 20, ...(pageParam ? { pageToken: pageParam } : {}) },
        })).data,
      ),
    getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
    enabled: Boolean(tenantMailboxConnectionId),
  });
}

export function useTenantMailboxMessage(
  tenantMailboxConnectionId?: string,
  messageId?: string,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "mailboxes", tenantMailboxConnectionId, "message", messageId],
    queryFn: async () =>
      unwrap<MailboxMessage>(
        (await axios.get(`bill-pay/mailbox-connections/${tenantMailboxConnectionId}/messages/${messageId}`)).data,
      ),
    enabled: Boolean(tenantMailboxConnectionId && messageId),
  });
}

export function useDownloadTenantMailboxAttachment() {
  const axios = useAxios();
  return useMutation({
    mutationFn: async ({
      tenantMailboxConnectionId,
      messageId,
      attachmentId,
    }: {
      tenantMailboxConnectionId: string;
      messageId: string;
      attachmentId: string;
    }) => {
      const response = await axios.get<Blob>(
        `bill-pay/mailbox-connections/${tenantMailboxConnectionId}/messages/${messageId}/attachments/${encodeURIComponent(attachmentId)}/download`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFromDisposition(response.headers["content-disposition"]);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });
}

/** Returns a blob URL for inline viewing instead of triggering a download. */
export function useViewTenantMailboxAttachment() {
  const axios = useAxios();
  return useMutation({
    mutationFn: async ({
      tenantMailboxConnectionId,
      messageId,
      attachmentId,
    }: {
      tenantMailboxConnectionId: string;
      messageId: string;
      attachmentId: string;
    }): Promise<{ url: string; filename: string; mimeType: string }> => {
      const response = await axios.get<Blob>(
        `bill-pay/mailbox-connections/${tenantMailboxConnectionId}/messages/${messageId}/attachments/${encodeURIComponent(attachmentId)}/download`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const filename = filenameFromDisposition(response.headers["content-disposition"]);
      const mimeType = response.data.type || "application/octet-stream";
      return { url, filename, mimeType };
    },
  });
}


