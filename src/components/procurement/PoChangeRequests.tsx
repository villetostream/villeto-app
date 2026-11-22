"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { useAuthStore } from "@/stores/auth-stores";
import {
  useEntityWorkspaceStore,
  workspaceQueryKey,
  workspaceReadOnly,
} from "@/features/entity-workspace/store";
import { toast } from "sonner";

type Summary = {
  priceChangeRequestId: string;
  purchaseOrderId: string;
  poNumber: string;
  vendorName: string;
  vendorLegalName: string;
  status: string;
  version: number;
  difference: string;
  currency: string;
  expiresAt: string;
};
type Pricing = {
  from: string;
  to: string;
  unitPrice: string;
  revision: number;
};
type Detail = {
  priceChangeRequestId: string;
  purchaseOrderId: string;
  version: number;
  status: string;
  expiresAt: string;
  basisRevision: number;
  proposal: {
    reason: string;
    supportingDocuments: { name: string; url: string }[];
  };
  comparison: {
    currency: string;
    previousTotal: string;
    totalAmount: string;
    difference: string;
    taxAmount: string;
    previousTaxAmount: string;
    discountAmount: string;
    chargeAmount: string;
    lineItems: {
      purchaseOrderLineItemId: string;
      name: string;
      quantity: string;
      proposedUnitPrice: string;
      previousAmount: string;
      proposedAmount: string;
      eligibleQuantity: string;
      pricing: Pricing[];
    }[];
  };
  history: {
    version: number;
    action: string;
    at: string;
    actorType: string;
    reason: string | null;
  }[];
  policyEvaluation: {
    resolution?: string;
    violations?: { ruleId: string; message: string }[];
  } | null;
  controls: { availableBudget: string; contractValidation: string };
};
const root = "/procurement/po-change-requests";
const label = (value: string) => value === "approved_pending_issue" ? "awaiting final approval" : value.replaceAll("_", " ");
const money = (value: string, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    Number(value),
  );
const errorMessage = (error: unknown) => {
  const data = (
    error as {
      response?: {
        data?: { message?: string | string[]; issues?: { message: string }[] };
      };
    }
  ).response?.data;
  return (
    data?.issues?.map((issue) => issue.message).join(" ") ||
    (Array.isArray(data?.message) ? data.message.join(" ") : data?.message) ||
    (error instanceof Error
      ? error.message
      : "Unable to complete this action. Please refresh and try again.")
  );
};
const button =
  "rounded-lg border px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed";

function ScopedPoChangeRequests({
  purchaseOrderId,
}: {
  purchaseOrderId?: string;
}) {
  const axios = useAxios();
  const client = useQueryClient();
  const can = useAuthStore((state) => state.canPermission);
  const authorization = useAuthStore((state) => state.authorization);
  const selection = useEntityWorkspaceStore((state) => state.selection);
  const generation = useEntityWorkspaceStore((state) => state.generation);
  const scopePrefix = workspaceQueryKey([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [justification, setJustification] = useState("");
  const [validity, setValidity] = useState<number | null>(null);
  const canRead =
    Boolean(authorization) &&
    ["read_company", "approval_decision", "issue"].some((action) =>
      can(`procurement.purchase_order.${action}`),
    );
  const readonly = workspaceReadOnly();
  const query = useQuery({
    queryKey: workspaceQueryKey([
      "po-change-requests",
      purchaseOrderId,
      status,
      page,
      generation,
    ]),
    enabled: canRead,
    queryFn: async () =>
      (
        await axios.get<{
          data: Summary[];
          meta: { totalPages: number; totalCount: number };
        }>(root, {
          params: {
            page,
            limit: 20,
            status: status || undefined,
            purchaseOrderId,
            legalEntityId:
              selection && selection !== "all" ? selection : undefined,
          },
        })
      ).data,
  });
  const detail = useQuery({
    queryKey: workspaceQueryKey(["po-change-request", selected, generation]),
    enabled: canRead && !!selected,
    staleTime: 30_000,
    queryFn: async () =>
      (await axios.get<{ data: Detail }>(`${root}/${selected}`)).data.data,
  });
  const settings = useQuery({
    queryKey: workspaceQueryKey(["po-change-settings", generation]),
    enabled: canRead && !purchaseOrderId,
    queryFn: async () =>
      (await axios.get<{ data: { validityDays: number } }>(`${root}/settings`))
        .data.data,
  });
  const mutation = useMutation({
    mutationFn: async (action: string) => {
      const current = detail.data;
      if (!current || readonly)
        throw new Error("Select an editable legal entity and request.");
      return (
        await axios.post<{ data: Detail }>(
          `${root}/${current.priceChangeRequestId}/${action}`,
          {
            expectedVersion: current.version,
            reason: reason.trim() || undefined,
            spendProgramJustification: justification.trim() || undefined,
          },
        )
      ).data.data;
    },
    onSuccess: async (result) => {
      toast.success(result.status === "applied"
        ? "Approved and issued. Revised prices are now effective."
        : result.status === "pending_review"
          ? "Approval recorded. Waiting for the remaining required approvals."
          : `Request is now ${label(result.status)}.`);
      setReason("");
      setJustification("");
      client.setQueryData([...scopePrefix, "po-change-request", result.priceChangeRequestId, generation], result);
      await client.invalidateQueries({
        predicate: (q) => scopePrefix.every((part, index) => q.queryKey[index] === part) && (
          (q.queryKey.some(part => typeof part === "string" && part.startsWith("po-change")) &&
            !q.queryKey.includes("po-change-settings") && !q.queryKey.includes("po-change-request")) ||
          (result.status === "applied" && q.queryKey.some(part => typeof part === "string" && (part.includes("purchaseOrder") || part.includes("purchase-order"))))
        ),
      });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const saveSettings = useMutation({
    mutationFn: async () => {
      await axios.put(`${root}/settings`, {
        validityDays: validity ?? settings.data?.validityDays ?? 14,
      });
    },
    onSuccess: async () => {
      await settings.refetch();
      toast.success("Validity updated for future submissions and corrections.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!canRead)
    return purchaseOrderId ? null : (
      <p className="p-6">
        You do not have permission to view PO change requests.
      </p>
    );
  const current = detail.data;
  return (
    <section className="space-y-5 rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">PO Change Requests</h1>
          <p className="text-sm text-gray-600">
            Review vendor price proposals. Final approval automatically issues
            the revised order and applies its prices.
          </p>
        </div>
        <button className={button} onClick={() => void query.refetch()}>
          Refresh
        </button>
      </div>
      {readonly && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm">
          Select a legal entity to approve and issue, reject, or return a change.
        </p>
      )}
      {!purchaseOrderId && settings.data && (
        <details className="rounded-lg border p-3">
          <summary>
            Request validity: {settings.data.validityDays} calendar days
          </summary>
          <p className="my-2 text-sm text-gray-600">
            Starts at submission, restarts on corrected resubmission, and must
            remain valid until revised-order issue. Setting changes affect
            future submissions.
          </p>
          {can("procurement_spend_program.manage") && (
            <div className="flex gap-2">
              <label>
                Calendar days{" "}
                <input
                  className="ml-2 w-20 rounded border p-2"
                  type="number"
                  min={1}
                  max={365}
                  value={validity ?? settings.data.validityDays}
                  onChange={(e) => setValidity(Number(e.target.value))}
                />
              </label>
              <button
                className={button}
                disabled={readonly || saveSettings.isPending}
                onClick={() => saveSettings.mutate()}
              >
                Save validity
              </button>
            </div>
          )}
        </details>
      )}
      <label className="block text-sm">
        Status{" "}
        <select
          className="ml-2 rounded-lg border p-2"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
            setSelected(null);
          }}
        >
          {[
            "",
            "pending_review",
            "returned_for_correction",
            "approved_pending_issue",
            "applied",
            "rejected",
            "withdrawn",
            "cancelled",
            "expired",
          ].map((s) => (
            <option key={s} value={s}>
              {s ? label(s) : "All statuses"}
            </option>
          ))}
        </select>
      </label>
      {query.isLoading && <p role="status">Loading requests…</p>}
      {query.isError && (
        <p role="alert" className="text-red-700">
          {errorMessage(query.error)}
        </p>
      )}
      {query.data && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Order / vendor</th>
                  <th>Status</th>
                  <th>Proposed difference</th>
                  <th>Valid until</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((row) => (
                  <tr key={row.priceChangeRequestId} className="border-b">
                    <td className="p-2">
                      <Link
                        className="font-medium text-emerald-800 underline"
                        href={`/procurement/purchase-order/${row.purchaseOrderId}`}
                      >
                        {row.poNumber}
                      </Link>
                      <div>{row.vendorName || row.vendorLegalName}</div>
                    </td>
                    <td>{label(row.status)}</td>
                    <td>{money(row.difference, row.currency)}</td>
                    <td>{new Date(row.expiresAt).toLocaleString()}</td>
                    <td>
                      <button
                        className={button}
                        onClick={() => {
                          setSelected(row.priceChangeRequestId);
                          setReason("");
                          setJustification("");
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data.data.length && (
            <p className="text-gray-600">
              No price change requests in this view.
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              className={button}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} · {query.data.meta.totalCount} requests
            </span>
            <button
              className={button}
              disabled={page >= query.data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {detail.isLoading && <p>Loading request details…</p>}
      {detail.isError && (
        <p role="alert" className="text-red-700">
          {errorMessage(detail.error)}
        </p>
      )}
      {current && (
        <div className="space-y-4 border-t pt-5">
          <div className="flex justify-between">
            <h2 className="font-semibold">
              Request version {current.version} · Based on PO revision{" "}
              {current.basisRevision} · {label(current.status)}
            </h2>
            <button className={button} onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <p className="whitespace-pre-wrap">{current.proposal.reason}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <p>
              Before this change
              <br />
              <strong>
                {money(
                  current.comparison.previousTotal,
                  current.comparison.currency,
                )}
              </strong>
            </p>
            <p>
              Proposed commitment
              <br />
              <strong>
                {money(
                  current.comparison.totalAmount,
                  current.comparison.currency,
                )}
              </strong>
            </p>
            <p>
              Difference
              <br />
              <strong>
                {money(
                  current.comparison.difference,
                  current.comparison.currency,
                )}
              </strong>
            </p>
          </div>
          <p className="text-sm">
            Tax:{" "}
            {money(
              current.comparison.previousTaxAmount,
              current.comparison.currency,
            )}{" "}
            → {money(current.comparison.taxAmount, current.comparison.currency)}
            . Discounts:{" "}
            {money(
              current.comparison.discountAmount,
              current.comparison.currency,
            )}
            . Charges:{" "}
            {money(
              current.comparison.chargeAmount,
              current.comparison.currency,
            )}
            .
          </p>
          <p className="rounded-lg bg-amber-50 p-3 text-sm">
            Available-budget and contract validation are unavailable in V1.
            Taxes follow the order’s existing effective tax rate. Current orders
            have no separately configured discount or charge terms.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Affected quantity</th>
                  <th>Previous affected value</th>
                  <th>Proposed unit price</th>
                  <th>Proposed affected value</th>
                </tr>
              </thead>
              <tbody>
                {current.comparison.lineItems.map((line) => (
                  <tr key={line.purchaseOrderLineItemId} className="border-t">
                    <td className="py-2">{line.name}</td>
                    <td>{line.quantity}</td>
                    <td>
                      {money(line.previousAmount, current.comparison.currency)}
                    </td>
                    <td>
                      {money(
                        line.proposedUnitPrice,
                        current.comparison.currency,
                      )}
                    </td>
                    <td>
                      {money(line.proposedAmount, current.comparison.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {current.proposal.supportingDocuments.map((doc) => (
            <a
              key={doc.url}
              className="block text-emerald-800 underline"
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {doc.name}
            </a>
          ))}
          {current.policyEvaluation && (
            <div>
              <h3 className="font-medium">
                Purchasing controls: {current.policyEvaluation.resolution}
              </h3>
              {current.policyEvaluation.violations?.map((v, i) => (
                <p key={`${v.ruleId}-${i}`} className="text-sm">
                  {v.message}
                </p>
              ))}
            </div>
          )}
          {[
            "pending_review",
            "returned_for_correction",
            "approved_pending_issue",
          ].includes(current.status) && (
            <>
              <label className="block text-sm">
                Decision reason
                <textarea
                  className="mt-1 w-full rounded-lg border p-2"
                  maxLength={4000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Purchasing policy justification
                <textarea
                  className="mt-1 w-full rounded-lg border p-2"
                  maxLength={4000}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
              </label>
              <p className="text-sm text-gray-600">The final required approval automatically issues the revised PO and makes its prices effective.</p>
              <div className="flex flex-wrap gap-2">
                {["pending_review", "approved_pending_issue"].includes(current.status) &&
                  can("procurement.purchase_order.approval_decision") && (
                    <button className={button} disabled={readonly || mutation.isPending} onClick={() => mutation.mutate("approve")}>
                      Approve and issue revised PO
                    </button>
                  )}
                {current.status === "pending_review" &&
                  can("procurement.purchase_order.approval_decision") && (
                    <>
                      <button
                        className={button}
                        disabled={
                          readonly || mutation.isPending || !reason.trim()
                        }
                        onClick={() => mutation.mutate("reject")}
                      >
                        Reject
                      </button>
                      <button
                        className={button}
                        disabled={
                          readonly || mutation.isPending || !reason.trim()
                        }
                        onClick={() => mutation.mutate("return")}
                      >
                        Return for correction
                      </button>
                    </>
                  )}
                {current.status === "approved_pending_issue" && (
                  <>
                    {can("procurement.purchase_order.cancel") && (
                      <button
                        className={button}
                        disabled={
                          readonly || mutation.isPending || !reason.trim()
                        }
                        onClick={() => mutation.mutate("cancel")}
                      >
                        Cancel approved change
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          <details>
            <summary className="cursor-pointer font-medium">
              Submission and decision history
            </summary>
            <ol className="mt-3 space-y-2">
              {current.history.map((entry, i) => (
                <li key={i} className="rounded border p-3 text-sm">
                  Version {entry.version} · {label(entry.action)} ·{" "}
                  {entry.actorType} · {new Date(entry.at).toLocaleString()}
                  {entry.reason && (
                    <p className="whitespace-pre-wrap">{entry.reason}</p>
                  )}
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}
    </section>
  );
}

export function PoChangeRequests({
  purchaseOrderId,
}: {
  purchaseOrderId?: string;
}) {
  const generation = useEntityWorkspaceStore((state) => state.generation);
  return (
    <ScopedPoChangeRequests
      key={`${generation}:${purchaseOrderId ?? "queue"}`}
      purchaseOrderId={purchaseOrderId}
    />
  );
}
