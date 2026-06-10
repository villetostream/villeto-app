"use client";

import { Lock, LockOpen } from "lucide-react";

interface ManagerOverrideBannerProps {
  isUnlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
}

/**
 * Shown on Company-scope detail views when a submitted request is awaiting
 * manager approval. Lets a super-admin consciously unlock the Approve/Reject
 * actions, making clear they are acting outside the normal approval chain.
 */
export function ManagerOverrideBanner({
  isUnlocked,
  onUnlock,
  onLock,
}: ManagerOverrideBannerProps) {
  if (isUnlocked) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
            <LockOpen className="h-3.5 w-3.5 text-amber-600" />
          </span>
          <span className="text-xs font-medium text-amber-700">
            Admin override active
          </span>
        </div>
        <button
          onClick={onLock}
          className="text-xs text-amber-600 hover:text-amber-800 underline underline-offset-2 transition-colors"
        >
          Lock again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200">
          <Lock className="h-3.5 w-3.5 text-slate-500" />
        </span>
        <p className="text-xs text-slate-600 leading-snug">
          Awaiting manager approval.{" "}
          <span className="font-medium text-slate-700">
            You can act on their behalf.
          </span>
        </p>
      </div>
      <button
        onClick={onUnlock}
        className="w-full h-8 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
      >
        Unlock Actions
      </button>
    </div>
  );
}
