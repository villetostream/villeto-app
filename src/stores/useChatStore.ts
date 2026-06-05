/**
 * useChatStore
 * ─────────────────────────────────────────────────────────────
 * Global Zustand store for the Villeto in-app chat widget.
 * Manages open/closed state, active tab (Team | Vendors),
 * conversation threads, and message history.
 *
 * NOTE: This is a frontend-only store. Wire up the API calls
 * in the action creators once the backend is ready.
 * ─────────────────────────────────────────────────────────────
 */

import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────

export type ChatTab = "team" | "vendors";

export type MessageStatus = "sending" | "sent" | "failed";

export type AttachmentType = "image" | "file";

export interface Attachment {
  id: string;
  name: string;
  url: string; // object URL or remote URL
  type: AttachmentType;
  size: number; // bytes
}

export interface ChatMessage {
  id: string;
  senderId: string; // userId or "me"
  senderName: string;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  attachments?: Attachment[];
}

/** A vendor conversation thread (PO, Invoice, General, etc.) */
export interface VendorThread {
  id: string;
  label: string; // e.g. "PO-1043", "General", "INV-2033"
}

export interface Conversation {
  id: string;
  tab: ChatTab;
  /** For team: userId; for vendors: vendorId */
  participantId: string;
  participantName: string;
  participantRole?: string; // e.g. "Design manager"
  participantCode?: string; // e.g. "E-001"
  /** Vendor-only: the selected thread */
  thread?: VendorThread;
  /** Vendor-only: available threads to pick from */
  availableThreads?: VendorThread[];
  messages: ChatMessage[];
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: Date;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  code?: string;
  avatarUrl?: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  threads: VendorThread[];
  unreadCount?: number;
}

interface ChatState {
  // Widget visibility
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;

  // Active tab
  activeTab: ChatTab;
  setActiveTab: (tab: ChatTab) => void;

  // Search queries
  teamSearch: string;
  vendorSearch: string;
  setTeamSearch: (q: string) => void;
  setVendorSearch: (q: string) => void;

  // People / vendors lists (populated from API)
  teamMembers: TeamMember[];
  vendors: Vendor[];
  setTeamMembers: (members: TeamMember[]) => void;
  setVendors: (vendors: Vendor[]) => void;

  // Conversation stack (each item is a "panel" rendered side-by-side)
  conversations: Conversation[];
  openConversation: (conv: Omit<Conversation, "messages" | "unreadCount">) => void;
  closeConversation: (id: string) => void;
  setConversationThread: (convId: string, thread: VendorThread) => void;

  // Messaging
  sendMessage: (convId: string, content: string, attachments?: Attachment[]) => void;
  markRead: (convId: string) => void;

  // Total unread badge
  totalUnread: number;
}

// ─── Helpers ──────────────────────────────────────────────────

let _idCounter = 1;
const uid = () => `msg-${Date.now()}-${_idCounter++}`;

// ─── Store ────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),

  activeTab: "team",
  setActiveTab: (tab) => set({ activeTab: tab }),

  teamSearch: "",
  vendorSearch: "",
  setTeamSearch: (q) => set({ teamSearch: q }),
  setVendorSearch: (q) => set({ vendorSearch: q }),

  teamMembers: [],
  vendors: [],
  setTeamMembers: (members) => set({ teamMembers: members }),
  setVendors: (vendors) => set({ vendors }),

  conversations: [],

  openConversation: (conv) => {
    const existing = get().conversations.find((c) => c.id === conv.id);
    if (existing) return; // already open
    set((s) => ({
      conversations: [
        ...s.conversations,
        { ...conv, messages: [], unreadCount: 0 },
      ],
    }));
  },

  closeConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
    })),

  setConversationThread: (convId, thread) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId ? { ...c, thread } : c
      ),
    })),

  sendMessage: (convId, content, attachments) => {
    const newMsg: ChatMessage = {
      id: uid(),
      senderId: "me",
      senderName: "You",
      content,
      timestamp: new Date(),
      status: "sent",
      attachments,
    };
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessage: content,
              lastMessageAt: new Date(),
            }
          : c
      ),
    }));
    // TODO: POST to /messages API and update status to "sent"/"failed"
  },

  markRead: (convId) =>
    set((s) => {
      const updated = s.conversations.map((c) =>
        c.id === convId ? { ...c, unreadCount: 0 } : c
      );
      const total = updated.reduce((acc, c) => acc + c.unreadCount, 0);
      return { conversations: updated, totalUnread: total };
    }),

  totalUnread: 0,
}));