"use client";

/**
 * ChatFAB
 * ─────────────────────────────────────────────────────────────
 * A persistent floating action button rendered in the
 * dashboard layout. Shows an unread-message badge and opens
 * the ChatWidget panel when clicked.
 * ─────────────────────────────────────────────────────────────
 */

import { useChatStore } from "@/stores/useChatStore";
import { MessageText } from "iconsax-reactjs";
import { motion, AnimatePresence } from "framer-motion";

export function ChatFAB() {
  const { toggleChat, isOpen, totalUnread } = useChatStore();

  return (
    <motion.button
      onClick={toggleChat}
      aria-label="Open messages"
      className={[
        "fixed bottom-6 right-6 z-50",
        "w-12 h-12 rounded-full shadow-lg",
        "flex items-center justify-center",
        "transition-colors duration-200",
        isOpen
          ? "bg-primary text-primary-foreground"
          : "bg-primary text-primary-foreground hover:opacity-90",
      ].join(" ")}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageText size={22} variant="Bold" />

      {/* Unread badge */}
      <AnimatePresence>
        {totalUnread > 0 && (
          <motion.span
            key="badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center"
          >
            {totalUnread > 99 ? "99+" : totalUnread}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}