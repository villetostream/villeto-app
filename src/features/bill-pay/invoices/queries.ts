import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useAxios } from "@/hooks/useAxios";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type InvoiceReviewAction = "approve" | "reject";

export function useBillPayInvoiceReviewAction() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      action,
      reason,
    }: {
      invoiceId: string;
      action: InvoiceReviewAction;
      reason?: string;
    }) => {
      const response = await axios.patch(
        `/bill-pay/invoices/${invoiceId}/${action}`,
        action === "reject" ? { reason } : {},
      );
      return response.data;
    },
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "invoices"]),
      }),
  });
}
