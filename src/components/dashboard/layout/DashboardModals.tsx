"use client";

/**
 * DashboardModals
 * ─────────────────────────────────────────────────────────────
 * Renders system-level modals that gate the dashboard.
 *
 * What changed (April 2026):
 *  • The AddCategoryModal after force-password-reset has been
 *    REMOVED for CONTROLLING_OFFICER first-timers.
 *    Expense category setup is now part of the VilletoTourGuide
 *    (step 4 — "Set Spend Rules").
 *  • Force-password-reset (SetPasswordModal) logic is UNCHANGED.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import SetPasswordModal from "@/components/invitation/SetPasswordModal";

export default function DashboardModals() {
    const user = useAuthStore((state) => state.user);
    const shouldChangePassword =
        (user as { shouldChangePassword?: boolean } | null)
            ?.shouldChangePassword === true;

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [hasCompletedFlow, setHasCompletedFlow] = useState(false);

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

    useEffect(() => {
        if (!flowGuardKey) return;
        const done = sessionStorage.getItem(flowGuardKey) === "1";
        if (done) setHasCompletedFlow(true);
    }, [flowGuardKey]);

    useEffect(() => {
        if (hasCompletedFlow) return;
        if (
            user &&
            ((isFirstLogin && isCompanyFounder) || mustChangePassword)
        ) {
            setShowPasswordModal(true);
        }
    }, [
        user,
        isFirstLogin,
        isCompanyFounder,
        mustChangePassword,
        hasCompletedFlow,
    ]);

    const markFlowComplete = () => {
        setHasCompletedFlow(true);
        setShowPasswordModal(false);
        if (flowGuardKey) sessionStorage.setItem(flowGuardKey, "1");
    };

    /**
     * After a successful password reset we mark the flow complete
     * and let VilletoTourGuide take over for the workspace setup.
     * (No more AddCategoryModal here.)
     */
    const handlePasswordSuccess = () => {
        markFlowComplete();

        // Optimistically update the store so the modal doesn't re-open
        useAuthStore.setState((state) => ({
            user: state.user
                ? {
                      ...state.user,
                      loginCount: 2,
                      shouldChangePassword: false,
                  }
                : null,
        }));
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