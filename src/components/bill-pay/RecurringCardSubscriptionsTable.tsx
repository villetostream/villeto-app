"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransactionLegalEntities } from "@/features/entity-workspace/hooks";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { useRecurringCardSubscriptions } from "@/queries/bill-pay/recurring-card";
import { resolveRecurringEntityId } from "./recurring-entity";

export function RecurringCardSubscriptionsTable() {
  const router = useRouter();
  const entities = useTransactionLegalEntities("finance");
  const options = entities.data?.data?.filter((entity) => entity.legalEntityId !== "all") || [];
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const workspaceSelection = useEntityWorkspaceStore((state) => state.selection);
  const primaryAssignmentId = useEntityWorkspaceStore((state) => state.snapshot?.primaryAssignment?.legalEntityId || null);
  const legalEntityId = resolveRecurringEntityId(options, {
    workspaceEnabled: entities.workspaceEnabled, workspaceSelection, primaryAssignmentId,
    legacyChoiceId: selectedEntityId,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const subscriptions = useRecurringCardSubscriptions({
    legalEntityId, search: search.trim() || undefined, status: status || undefined, page, limit: 10,
  });

  if (entities.isLoading) return <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">Loading legal entities…</div>;
  if (entities.isError) return <div className="rounded-xl border bg-white p-6 text-sm text-red-600">Could not load legal entities.</div>;
  if (!legalEntityId) return <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">
    <p>Select one finance-eligible legal entity to view card subscriptions.</p>
    {!entities.workspaceEnabled && <select aria-label="Legal entity" value={selectedEntityId}
      onChange={(event) => setSelectedEntityId(event.target.value)} className="mt-3 rounded-lg border px-3 py-2 text-sm">
      <option value="">Select legal entity</option>
      {options.map((entity) => <option key={entity.legalEntityId} value={entity.legalEntityId}>{entity.legalName}</option>)}
    </select>}
  </div>;

  const meta = subscriptions.data?.meta;
  return <div className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-[#10231d]">Company card subscriptions</h3>
        <p className="mt-1 text-xs text-gray-500">Merchants charge the card directly. Drafts are waiting for transaction monitoring.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search card subscriptions" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder="Search merchant or plan" className="rounded-lg border px-3 py-2 text-xs" />
        <select aria-label="Card subscription status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}
          className="rounded-lg border px-3 py-2 text-xs">
          <option value="">All states</option><option value="draft">Draft</option><option value="active">Active</option>
          <option value="paused">Paused</option><option value="ended">Ended</option>
        </select>
        {!entities.workspaceEnabled && options.length > 1 && <select aria-label="Legal entity" value={legalEntityId}
          onChange={(event) => { setSelectedEntityId(event.target.value); setPage(1); }} className="rounded-lg border px-3 py-2 text-xs">
          <option value="">Select legal entity</option>
          {options.map((entity) => <option key={entity.legalEntityId} value={entity.legalEntityId}>{entity.legalName}</option>)}
        </select>}
      </div>
    </div>
    {subscriptions.isLoading ? <div className="py-12 text-center text-sm text-gray-500">Loading card subscriptions…</div>
      : subscriptions.isError ? <div className="py-12 text-center text-sm text-red-600">Could not load card subscriptions. <button type="button" className="underline" onClick={() => subscriptions.refetch()}>Try again</button></div>
      : !subscriptions.data?.data.length ? <div className="py-12 text-center text-sm text-gray-500">No card subscriptions yet.</div>
      : <div className="overflow-x-auto"><table className="w-full text-left text-xs">
        <thead><tr className="border-b text-[10px] uppercase tracking-wide text-gray-400">
          <th className="px-4 py-3">Merchant</th><th className="px-4 py-3">Plan</th>
          <th className="px-4 py-3">Expected amount</th><th className="px-4 py-3">Cadence</th>
          <th className="px-4 py-3">First expected charge</th><th className="px-4 py-3">Status</th>
        </tr></thead>
        <tbody>{subscriptions.data.data.map((row) => <tr key={row.recurringCardSubscriptionId}
          className="cursor-pointer border-b hover:bg-gray-50" onClick={() => router.push(`/bill-pay/recurring-card-subscriptions/${row.recurringCardSubscriptionId}`)}>
          <td className="px-4 py-4 font-semibold">{row.merchantName}</td><td className="px-4 py-4">{row.description}</td>
          <td className="px-4 py-4">{row.expectedAmount ? `${row.currency} ${row.expectedAmount}` : "Variable"}</td>
          <td className="px-4 py-4 capitalize">{row.cadence}</td><td className="px-4 py-4">{row.firstExpectedChargeDate}</td>
          <td className="px-4 py-4 capitalize">{row.status === "draft" ? "Draft · monitoring pending" : row.status}</td>
        </tr>)}</tbody>
      </table></div>}
    <div className="flex items-center justify-between border-t pt-3 text-xs text-gray-500">
      <span>{meta ? `${meta.totalCount} subscriptions` : ""}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="rounded border px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {Math.max(1, meta?.totalPages || 1)}</span>
        <button type="button" className="rounded border px-2 py-1 disabled:opacity-40" disabled={page >= (meta?.totalPages || 1)} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  </div>;
}
