"use client";

import { useEffect } from "react";
import type { AxiosInstance } from "axios";
import { useAxios } from "@/hooks/useAxios";
import { useAuthStore, type User } from "@/stores/auth-stores";
import { AUTHORIZATION_INVALIDATED_EVENT, parseAuthorizationSnapshot } from "./authorization";

// Preserve the existing two-minute permission propagation window while visible.
export const AUTHORIZATION_CHECK_MS = 2 * 60 * 1000;
const pending = new Map<string, Promise<void>>();

export function refreshAuthorization(client: AxiosInstance): Promise<void> {
  const state = useAuthStore.getState();
  const user = state.user;
  const token = state.accessToken;
  const companyId = user?.companyId || user?.company?.companyId;
  if (!user || !token || !companyId) return Promise.resolve();
  const key = JSON.stringify([companyId, user.userId, token]);
  const existing = pending.get(key);
  if (existing) return existing;
  const revision = state.authorization?.revision;
  const request = (async () => {
    const response = await client.get("/users/me", {
      params: { view: "authorization", ...(revision ? { revision } : {}) },
    });
    const data = response.data?.data ?? response.data;
    const current = useAuthStore.getState();
    // A late response must never restore another login's access or profile.
    if (current.accessToken !== token || current.user?.userId !== user.userId ||
      (current.user?.companyId || current.user?.company?.companyId) !== companyId) return;
    if (data.userId !== user.userId || data.companyId !== companyId) throw new Error("Session identity mismatch");
    const authorization = data.unchanged === true
      ? current.authorization
      : parseAuthorizationSnapshot(data.authorization);
    if (!authorization || authorization.revision !== data.revision) throw new Error("Invalid authorization revision");
    current.setProfile({ ...current.user,
      status: data.status,
      companyRole: data.companyRole as User["companyRole"],
      authorization,
    });
  })().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export function useAuthorizationRefresh(enabled: boolean) {
  const client = useAxios();
  const userId = useAuthStore((s) => s.user?.userId);
  const companyId = useAuthStore((s) => s.user?.companyId || s.user?.company?.companyId);
  useEffect(() => {
    if (!enabled || !userId || !companyId) return;
    let invalidated = false;
    let checking = false;
    let disposed = false;
    const check = () => {
      if (disposed || checking || document.visibilityState === "hidden") return;
      if (!invalidated && !useAuthStore.getState().isAuthorizationStale(AUTHORIZATION_CHECK_MS)) return;
      invalidated = false;
      checking = true;
      // Failure leaves freshness unchanged. Retry on the next interval/focus;
      // the transport handles expired sessions, and resource APIs enforce access.
      void refreshAuthorization(client).catch(() => {}).finally(() => {
        checking = false;
        if (invalidated) check();
      });
    };
    const invalidate = () => { invalidated = true; check(); };
    check();
    const timer = window.setInterval(check, AUTHORIZATION_CHECK_MS);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    window.addEventListener(AUTHORIZATION_INVALIDATED_EVENT, invalidate);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener(AUTHORIZATION_INVALIDATED_EVENT, invalidate);
    };
  }, [enabled, userId, companyId, client]);
}
