"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEntityWorkspaceStore, workspaceReadOnly } from "./store";

export function EntityWorkspaceContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const state = useEntityWorkspaceStore();
  const operational = /^\/(procurement|bill-pay|accounting)(\/|$)/.test(pathname) || pathname.startsWith("/people/directory");
  if (!state.snapshot?.enabled || !operational) return children;
  if (!state.selection) return <div role="alert" className="rounded-xl border bg-white p-6">{state.snapshot.canSwitch ? "Choose a legal entity in the header to continue." : "Your workspace needs a primary legal entity assignment and entity access. Contact your organization administrator."}</div>;
  if (workspaceReadOnly() && /\/(new|add|edit)(\/|$)/.test(pathname)) return <div role="alert" className="rounded-xl border bg-white p-6">Select an active legal entity in the header before creating or editing a transaction.</div>;
  return <>{workspaceReadOnly() && <p className="mb-4 text-sm text-[#68726d]">Read-only workspace. Open a record to view its legal entity.</p>}{children}</>;
}
