"use client";

import { useEntityWorkspaceStore, workspaceReadOnly } from "./store";
import { reportReviewRoute, workspaceRoute } from "./transport";

/** Fetch/SSE consumers share the same scope and cancellation rules as Axios. */
export async function workspaceFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const state = useEntityWorkspaceStore.getState();
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "http://localhost");
  const backend = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.villeto.com/");
  const internal = url.origin === backend.origin || url.origin === "http://localhost";
  const scoped = internal && (workspaceRoute(url.pathname) || reportReviewRoute(url.pathname + url.search));
  if (!state.snapshot?.enabled || !scoped) return fetch(input, init);
  if (!state.selection) throw new DOMException("A legal entity assignment or selection is required", "AbortError");
  const headers = new Headers(init.headers);
  headers.set("X-Villeto-Legal-Entity", state.selection);
  const mutation = !["GET", "HEAD", "OPTIONS"].includes((init.method || "GET").toUpperCase()) || /notifications\/mark/.test(url.pathname);
  if (mutation && workspaceReadOnly()) throw new DOMException("Select an active legal entity before performing this action", "AbortError");
  const controller = new AbortController();
  const unsubscribe = useEntityWorkspaceStore.subscribe(next => {
    if (next.generation !== state.generation) controller.abort();
  });
  if (init.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  controller.signal.addEventListener("abort", unsubscribe, { once: true });
  const streaming = headers.get("Accept")?.includes("text/event-stream");
  if (mutation) state.mutationStarted();
  try {
    const response = await fetch(input, { ...init, headers, signal: controller.signal });
    if (useEntityWorkspaceStore.getState().generation !== state.generation) throw new DOMException("Workspace changed", "AbortError");
    return response;
  } finally {
    if (!streaming) unsubscribe();
    if (mutation) useEntityWorkspaceStore.getState().mutationFinished();
  }
}
