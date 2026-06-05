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

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChatFAB } from "./ChatFAB";
import { ChatWidget } from "./ChatWidget";

export function ChatPortal() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <ChatWidget />
      <ChatFAB />
    </>,
    document.body
  );
}