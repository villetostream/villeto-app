"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { buildAuthorizationPolicies } from "./policies";

export function useAuthorizationPolicies() {
  const authorization = useAuthStore((state) => state.authorization);
  return useMemo(() => buildAuthorizationPolicies(authorization ?? null), [authorization]);
}
