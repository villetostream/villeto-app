"use client";

import { useEntityWorkspaceStore, workspaceReadOnly } from "./store";
import {
  optionalWorkspaceDetail,
  reportReviewRoute,
  workspaceRoute,
} from "./transport";

/** Fetch/SSE consumers share the same scope and cancellation rules as Axios. */
export async function workspaceFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const state = useEntityWorkspaceStore.getState();
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    "http://localhost",
  );
  const request = input instanceof Request ? input : null;
  const method = init.method || request?.method || "GET";
  const backend = new URL(
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.villeto.com/",
  );
  const internal =
    url.origin === backend.origin || url.origin === "http://localhost";
  const optionalDetail = optionalWorkspaceDetail(url.pathname, method);
  const scoped =
    internal &&
    (optionalDetail ||
      workspaceRoute(url.pathname, method) ||
      reportReviewRoute(url.pathname + url.search));
  if (!state.snapshot?.enabled || !scoped) return fetch(input, init);
  if (!state.selection && !optionalDetail)
    throw new DOMException(
      "A legal entity assignment or selection is required",
      "AbortError",
    );
  const headers = new Headers(request?.headers);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  if (state.selection) headers.set("X-Villeto-Legal-Entity", state.selection);
  const mutation =
    !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase()) ||
    /notifications\/mark/.test(url.pathname);
  if (mutation && workspaceReadOnly())
    throw new DOMException(
      "Select an active legal entity before performing this action",
      "AbortError",
    );
  const controller = new AbortController();
  const unsubscribe = useEntityWorkspaceStore.subscribe((next) => {
    if (next.generation !== state.generation) controller.abort();
  });
  const signal = init.signal || request?.signal;
  const abort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abort, { once: true });
  }
  controller.signal.addEventListener("abort", unsubscribe, { once: true });
  const streaming = headers.get("Accept")?.includes("text/event-stream");
  let keepStreaming = false;
  if (mutation) state.mutationStarted();
  try {
    const response = await fetch(input, {
      ...init,
      headers,
      signal: controller.signal,
    });
    if (useEntityWorkspaceStore.getState().generation !== state.generation)
      throw new DOMException("Workspace changed", "AbortError");
    keepStreaming = !!streaming && response.ok;
    return response;
  } finally {
    if (!keepStreaming) {
      unsubscribe();
      signal?.removeEventListener("abort", abort);
    }
    if (mutation) useEntityWorkspaceStore.getState().mutationFinished();
  }
}
