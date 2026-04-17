"use client";

/**
 * DashboardModals
 * ─────────────────────────────────────────────────────────────
 * Renders system-level modals that gate the dashboard.
 *
 * What changed (April 2026 — Setup Guide update):
 *  • After a successful force-password-reset, we now call
 *    `setSetupGuideReady(true)` in useTourStore so that
 *    VilletoSetupGuide knows the password modal is done and
 *    it is safe to show the interactive setup guide.
 *  • VilletoTourGuide is excluded for users who get the
 *    Setup Guide (handled inside VilletoTourGuide itself).
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { useTourStore } from "@/stores/useTourStore";
import SetPasswordModal from "@/components/invitation/SetPasswordModal";

export default function DashboardModals() {
  const user = useAuthStore((state) => state.user);
  const setSetupGuideReady = useTourStore((s) => s.setSetupGuideReady);

  const shouldChangePassword =
    (user as { shouldChangePassword?: boolean } | null)
      ?.shouldChangePassword === true;

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hasCompletedFlow,  setHasCompletedFlow]  = useState(false);

  const flowGuardKey = useMemo(
    () =>
      user?.userId
        ? `dashboard-modals-flow-complete:${user.userId}`
        : null,
    [user?.userId]
  );

  const isCompanyFounder =
    user?.position === "CONTROLLING_OFFICER" &&
    user?.createdAt === user?.company?.createdAt;

  const isFirstLogin =
    typeof user?.loginCount === "number" && user.loginCount < 1;

  const mustChangePassword = shouldChangePassword;

  // ── Restore session guard ──────────────────────────────────
  useEffect(() => {
    if (!flowGuardKey) return;
    const done = sessionStorage.getItem(flowGuardKey) === "1";
    if (done) {
      setHasCompletedFlow(true);
      // If flow was already complete in a previous render (page refresh),
      // signal the setup guide immediately.
      setSetupGuideReady(true);
    }
  }, [flowGuardKey, setSetupGuideReady]);

  // ── Show password modal when needed ───────────────────────
  useEffect(() => {
    if (hasCompletedFlow || !user) return;
    if ((isFirstLogin && isCompanyFounder) || mustChangePassword) {
      setShowPasswordModal(true);
    } else {
      // If no password change is needed, unblock the setup guide
      setHasCompletedFlow(true);
      setSetupGuideReady(true);
      if (flowGuardKey) sessionStorage.setItem(flowGuardKey, "1");
    }
  }, [
    user,
    isFirstLogin,
    isCompanyFounder,
    mustChangePassword,
    hasCompletedFlow,
    flowGuardKey,
    setSetupGuideReady,
  ]);

  const markFlowComplete = () => {
    setHasCompletedFlow(true);
    setShowPasswordModal(false);
    if (flowGuardKey) sessionStorage.setItem(flowGuardKey, "1");
  };

  /**
   * After a successful password reset:
   *  1. Mark the modal flow complete so it won't re-open.
   *  2. Optimistically update the store so no stale re-trigger.
   *  3. Signal the Setup Guide that it can now appear.
   */
  const handlePasswordSuccess = () => {
    markFlowComplete();

    useAuthStore.setState((state) => ({
      user: state.user
        ? {
            ...state.user,
            loginCount: 2,
            shouldChangePassword: false,
          }
        : null,
    }));

    // Small delay so the modal finishes its close animation
    // before the Setup Guide overlay appears.
    setTimeout(() => setSetupGuideReady(true), 500);
  };

  if (!user) return null;

  return (
    <SetPasswordModal
      open={showPasswordModal}
      onOpenChange={setShowPasswordModal}
      email={user.email}
      onSuccess={handlePasswordSuccess}
      preventDismiss={true}
      requireOldPassword={true}
    />
  );
}
