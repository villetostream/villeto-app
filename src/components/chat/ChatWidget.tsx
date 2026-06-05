"use client";

/**
 * ChatWidget
 * ─────────────────────────────────────────────────────────────
 * The main chat panel that slides in from the bottom-right.
 * Renders one of three views based on state:
 *
 *  1. Contact list  — Team / Vendors tab with search
 *  2. Vendor inbox  — Thread list for a selected vendor
 *  3. Conversation  — Active chat thread
 *
 * Multiple conversations can be open simultaneously; each is
 * rendered as a stacked panel accessible via the conversations
 * stack in the store.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChatStore, Vendor, TeamMember, Conversation } from "@/stores/useChatStore";
import { ChatConversationPanel } from "./ChatConversationPanel";
import { cn } from "@/lib/utils";
import {
  Messages2,
  SearchNormal1,
  Profile,
  Building,
  Add,
} from "iconsax-reactjs";
import { X } from "lucide-react";

// ─── Mock data (remove when API is wired) ─────────────────────
const MOCK_TEAM: TeamMember[] = [
  { id: "u1", name: "Sunday Israel", role: "Design manager", code: "E-001" },
  { id: "u2", name: "Amara Okonkwo", role: "Finance lead", code: "E-002" },
  { id: "u3", name: "Bode Adeyemi", role: "Procurement officer", code: "E-003" },
  { id: "u4", name: "Chisom Eze", role: "Operations manager", code: "E-004" },
  { id: "u5", name: "Damilola Alabi", role: "HR manager", code: "E-005" },
];

const MOCK_VENDORS: Vendor[] = [
  {
    id: "v1",
    name: "ABC Supplies Ltd",
    code: "E-001",
    unreadCount: 2,
    threads: [
      { id: "t1", label: "PO-1043" },
      { id: "t2", label: "PO-1098" },
      { id: "t3", label: "INV-2033" },
      { id: "t4", label: "Delivery Confirmation DC-442" },
      { id: "t5", label: "General" },
    ],
  },
  {
    id: "v2",
    name: "TechSolutions Inc.",
    code: "E-001",
    threads: [
      { id: "t6", label: "PO-2210" },
      { id: "t7", label: "General" },
    ],
  },
  {
    id: "v3",
    name: "Tools & Co",
    code: "E-001",
    threads: [
      { id: "t8", label: "PO-3301" },
      { id: "t9", label: "General" },
    ],
  },
];
// ─────────────────────────────────────────────────────────────

type PanelView =
  | { type: "list" }
  | { type: "vendor-inbox"; vendor: Vendor }
  | { type: "conversation"; convId: string };

export function ChatWidget() {
  const {
    isOpen,
    closeChat,
    activeTab,
    setActiveTab,
    teamSearch,
    vendorSearch,
    setTeamSearch,
    setVendorSearch,
    teamMembers,
    vendors,
    setTeamMembers,
    setVendors,
    conversations,
    openConversation,
  } = useChatStore();

  const [panelView, setPanelView] = useState<PanelView>({ type: "list" });

  // Load mock data on mount (replace with API calls)
  useEffect(() => {
    if (teamMembers.length === 0) setTeamMembers(MOCK_TEAM);
    if (vendors.length === 0) setVendors(MOCK_VENDORS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to list when widget closes
  useEffect(() => {
    if (!isOpen) setPanelView({ type: "list" });
  }, [isOpen]);

  // ─── Filtered lists ──────────────────────────────────────────
  const filteredTeam = teamMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      m.role.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  // ─── Open team conversation ──────────────────────────────────
  const openTeamConv = (member: TeamMember) => {
    const convId = `team-${member.id}`;
    openConversation({
      id: convId,
      tab: "team",
      participantId: member.id,
      participantName: member.name,
      participantRole: member.role,
      participantCode: member.code,
    });
    setPanelView({ type: "conversation", convId });
  };

  // ─── Open vendor inbox ───────────────────────────────────────
  const openVendorInbox = (vendor: Vendor) => {
    setPanelView({ type: "vendor-inbox", vendor });
  };

  // ─── Open vendor thread ──────────────────────────────────────
  const openVendorThread = (vendor: Vendor, threadId: string) => {
    const thread = vendor.threads.find((t) => t.id === threadId);
    const convId = `vendor-${vendor.id}-${threadId}`;
    openConversation({
      id: convId,
      tab: "vendors",
      participantId: vendor.id,
      participantName: vendor.name,
      participantCode: vendor.code,
      thread,
      availableThreads: vendor.threads,
    });
    setPanelView({ type: "conversation", convId });
  };

  // ─── Start new vendor conversation ──────────────────────────
  const startNewVendorConversation = (vendor: Vendor) => {
    const convId = `vendor-${vendor.id}-new-${Date.now()}`;
    openConversation({
      id: convId,
      tab: "vendors",
      participantId: vendor.id,
      participantName: vendor.name,
      participantCode: vendor.code,
      availableThreads: vendor.threads,
    });
    setPanelView({ type: "conversation", convId });
  };

  // ─── Active conversation ─────────────────────────────────────
  const activeConv =
    panelView.type === "conversation"
      ? conversations.find((c) => c.id === panelView.convId)
      : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="chat-widget"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "fixed bottom-20 right-6 z-50",
            "w-[360px] h-[580px]",
            "bg-white rounded-2xl shadow-2xl border border-gray-100",
            "flex flex-col overflow-hidden"
          )}
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.14)" }}
        >
          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#CCFBF1] flex items-center justify-center">
              <Messages2 size={16} className="text-[#0D9488]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Messages</p>
              <p className="text-[11px] text-gray-500">Communication centre</p>
            </div>
            <button
              onClick={closeChat}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Tabs (always visible on list view) ── */}
          {(panelView.type === "list" || panelView.type === "vendor-inbox") && (
            <div className="flex border-b border-gray-100 flex-shrink-0">
              <TabButton
                active={activeTab === "team"}
                onClick={() => {
                  setActiveTab("team");
                  setPanelView({ type: "list" });
                }}
                icon={<Profile size={14} />}
                label="Team"
              />
              <TabButton
                active={activeTab === "vendors"}
                onClick={() => {
                  setActiveTab("vendors");
                  setPanelView({ type: "list" });
                }}
                icon={<Building size={14} />}
                label="Vendors"
              />
            </div>
          )}

          {/* ── Body ── */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              {/* Contact / vendor list */}
              {panelView.type === "list" && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Search */}
                  <div className="px-4 py-3 flex-shrink-0">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <SearchNormal1 size={14} className="text-gray-400 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder={
                          activeTab === "team"
                            ? "Search employees..."
                            : "Search vendors..."
                        }
                        className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
                        value={activeTab === "team" ? teamSearch : vendorSearch}
                        onChange={(e) =>
                          activeTab === "team"
                            ? setTeamSearch(e.target.value)
                            : setVendorSearch(e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {activeTab === "team" ? (
                      <>
                        {filteredTeam.length === 0 && (
                          <p className="text-sm text-gray-400 text-center mt-8">
                            No team members found
                          </p>
                        )}
                        {filteredTeam.map((member) => (
                          <TeamMemberRow
                            key={member.id}
                            member={member}
                            onClick={() => openTeamConv(member)}
                            conversation={conversations.find(
                              (c) => c.id === `team-${member.id}`
                            )}
                          />
                        ))}
                      </>
                    ) : (
                      <>
                        {filteredVendors.length === 0 && (
                          <p className="text-sm text-gray-400 text-center mt-8">
                            No vendors found
                          </p>
                        )}
                        {filteredVendors.map((vendor) => (
                          <VendorRow
                            key={vendor.id}
                            vendor={vendor}
                            onClick={() => openVendorInbox(vendor)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Vendor inbox (thread list) */}
              {panelView.type === "vendor-inbox" && (
                <motion.div
                  key="vendor-inbox"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <VendorInboxPanel
                    vendor={panelView.vendor}
                    conversations={conversations}
                    onBack={() => setPanelView({ type: "list" })}
                    onOpenThread={(threadId) =>
                      openVendorThread(panelView.vendor, threadId)
                    }
                    onNewConversation={() =>
                      startNewVendorConversation(panelView.vendor)
                    }
                  />
                </motion.div>
              )}

              {/* Active conversation */}
              {panelView.type === "conversation" && activeConv && (
                <motion.div
                  key={`conv-${panelView.convId}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <ChatConversationPanel
                    conversation={activeConv}
                    onBack={() => {
                      if (activeConv.tab === "vendors") {
                        const vendor = vendors.find(
                          (v) => v.id === activeConv.participantId
                        );
                        if (vendor) {
                          setPanelView({ type: "vendor-inbox", vendor });
                          return;
                        }
                      }
                      setPanelView({ type: "list" });
                    }}
                  />
                </motion.div>
              )}

              {/* Conversation closed / not found */}
              {panelView.type === "conversation" && !activeConv && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-gray-400">Conversation not found.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors",
        active
          ? "border-[#0D9488] text-[#0D9488]"
          : "border-transparent text-gray-500 hover:text-gray-700"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function TeamMemberRow({
  member,
  onClick,
  conversation,
}: {
  member: TeamMember;
  onClick: () => void;
  conversation?: Conversation;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 rounded-lg px-2 transition-colors group"
    >
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Profile size={16} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex justify-between items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
          {conversation?.lastMessageAt && (
             <p className="text-[10px] text-gray-400 whitespace-nowrap">
               {new Date(conversation.lastMessageAt).toLocaleTimeString("en-GB", {
                 hour: "2-digit",
                 minute: "2-digit",
               })}
             </p>
          )}
        </div>
        <p className="text-[11px] text-gray-400 truncate">{member.role}</p>
        
        {conversation?.lastMessage && (
          <p className="text-[12px] text-gray-500 truncate mt-0.5">
             {conversation.lastMessage}
          </p>
        )}
      </div>
      {conversation && conversation.unreadCount > 0 ? (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#0D9488] text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-1">
          {conversation.unreadCount}
        </span>
      ) : conversation ? (
        <span className="w-2 h-2 rounded-full bg-[#0D9488] flex-shrink-0 mt-2" />
      ) : null}
    </button>
  );
}

function VendorRow({
  vendor,
  onClick,
}: {
  vendor: Vendor;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 rounded-lg px-1 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Building size={16} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{vendor.name}</p>
        <p className="text-[11px] text-gray-500">{vendor.code}</p>
      </div>
      {vendor.unreadCount && vendor.unreadCount > 0 ? (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#0D9488] text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
          {vendor.unreadCount}
        </span>
      ) : null}
    </button>
  );
}

// ─── Vendor inbox panel ────────────────────────────────────────

function VendorInboxPanel({
  vendor,
  conversations,
  onBack,
  onOpenThread,
  onNewConversation,
}: {
  vendor: Vendor;
  conversations: Conversation[];
  onBack: () => void;
  onOpenThread: (threadId: string) => void;
  onNewConversation: () => void;
}) {
  // All conversations for this vendor
  const vendorConvs = conversations.filter((c) => c.participantId === vendor.id);

  // Derive thread rows: one per thread that has been opened,
  // plus threads from vendor.threads not yet opened
  const openedThreadIds = new Set(
    vendorConvs.map((c) => c.thread?.id).filter(Boolean)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Back"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {vendor.name}
          </p>
          <p className="text-[11px] text-gray-500">{vendor.code}</p>
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
        {vendorConvs.map((conv) => (
          <ThreadRow
            key={conv.id}
            label={conv.thread?.label ?? "General"}
            preview={conv.lastMessage}
            time={conv.lastMessageAt}
            unread={conv.unreadCount}
            isNew={conv.messages.length === 0}
            onClick={() => onOpenThread(conv.thread?.id ?? "")}
          />
        ))}

        {/* Threads not yet opened */}
        {vendor.threads
          .filter((t) => !openedThreadIds.has(t.id))
          .map((thread) => (
            <ThreadRow
              key={thread.id}
              label={thread.label}
              onClick={() => onOpenThread(thread.id)}
            />
          ))}
      </div>

      {/* Start new conversation CTA */}
      <div className="px-4 pb-4 flex-shrink-0">
        <button
          onClick={onNewConversation}
          className="w-full py-2.5 rounded-xl bg-[#0D9488] text-white text-sm font-semibold hover:bg-[#0f766e] transition-colors flex items-center justify-center gap-2"
        >
          <Add size={16} />
          Start a new conversation
        </button>
      </div>
    </div>
  );
}

function ThreadRow({
  label,
  preview,
  time,
  unread,
  isNew,
  onClick,
}: {
  label: string;
  preview?: string;
  time?: Date;
  unread?: number;
  isNew?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left border border-gray-100 mb-1"
    >
      <div className="w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Messages2 size={14} className="text-[#0D9488]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
          {isNew && (
            <span className="text-[10px] bg-amber-400 text-white font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
              New
            </span>
          )}
        </div>
        {preview && (
          <p className="text-[11px] text-gray-500 truncate mt-0.5">{preview}</p>
        )}
        {time && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            {new Date(time).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })},{" "}
            {new Date(time).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
      {unread && unread > 0 ? (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#0D9488] text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
          {unread}
        </span>
      ) : null}
    </button>
  );
}