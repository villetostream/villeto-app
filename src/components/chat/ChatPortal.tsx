"use client";

/**
 * ChatPortal
 * ─────────────────────────────────────────────────────────────
 * Renders the ChatFAB and ChatWidget into a dedicated DOM node
 * so they always float on top of every page without being
 * clipped by overflow:hidden ancestors.
 *
 * Mount this ONCE inside DashboardLayoutContent alongside the
 * other system-level components (VilletoTourGuide, etc.).
 * ─────────────────────────────────────────────────────────────
 */

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChatFAB } from "./ChatFAB";
import { ChatWidget } from "./ChatWidget";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ChatPortal() {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) return null;

  return createPortal(
    <>
      <ChatWidget />
      <ChatFAB />
    </>,
    document.body
  );
}