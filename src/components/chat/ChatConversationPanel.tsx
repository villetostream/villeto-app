"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  useChatStore,
  Conversation,
  VendorThread,
  Attachment,
} from "@/stores/useChatStore";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { groupMessagesByDate, createAttachmentFromFile } from "./chat-utils";
import { cn } from "@/lib/utils";
import { ArrowLeft, Add, Send2, DocumentText } from "iconsax-reactjs";
import { X } from "lucide-react";

interface Props {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatConversationPanel({ conversation, onBack }: Props) {
  const { sendMessage, setConversationThread, closeConversation } = useChatStore();

  const [text, setText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isVendor = conversation.tab === "vendors";
  const hasThread = !!conversation.thread;
  const isEmpty = conversation.messages.length === 0;

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages]);

  // Send
  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && pendingAttachments.length === 0) return;
    sendMessage(conversation.id, trimmed, pendingAttachments);
    setText("");
    setPendingAttachments([]);
  }, [text, pendingAttachments, conversation.id, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // File picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const attachments = files.map(createAttachmentFromFile);
    setPendingAttachments((prev) => [...prev, ...attachments]);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const grouped = groupMessagesByDate(conversation.messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {conversation.participantName}
          </p>
          <p className="text-[11px] text-gray-500 truncate">
            {isVendor ? "Vendor" : conversation.participantRole}
            {conversation.participantCode ? ` • ${conversation.participantCode}` : ""}
            {isVendor && conversation.thread ? ` — ${conversation.thread.label}` : ""}
          </p>
        </div>
        <button
          onClick={() => closeConversation(conversation.id)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close conversation"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {isEmpty && !isVendor && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">
              Send your first message to {conversation.participantName}
            </p>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.label} className="flex flex-col gap-3">
            {/* Date separator */}
            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] text-gray-400 font-medium px-2">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {group.messages.map((msg, i) => {
              const isOwn = msg.senderId === "me";
              const prevMsg = group.messages[i - 1];
              const showSender =
                !isOwn && (!prevMsg || prevMsg.senderId !== msg.senderId);
              return (
                <div
                  key={msg.id}
                  className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                >
                  <ChatMessageBubble
                    message={msg}
                    isOwn={isOwn}
                    showSender={showSender}
                  />
                </div>
              );
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Vendor: thread picker (shown when empty, before first message) */}
      {isVendor && isEmpty && !hasThread && conversation.availableThreads && (
        <div className="px-4 pb-3 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-700 mb-1.5">
            Attach this message to
          </p>
          <p className="text-[11px] text-gray-500 mb-2">
            Select a thread to help properly classify messages
          </p>
          <div className="flex flex-wrap gap-1.5">
            {conversation.availableThreads.map((thread) => (
              <ThreadChip
                key={thread.id}
                thread={thread}
                selected={conversation.thread?.id === thread.id}
                onSelect={() => setConversationThread(conversation.id, thread)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Vendor: persistent thread selector when thread IS selected */}
      {isVendor && hasThread && conversation.availableThreads && (
        <div className="px-4 pt-2 pb-1 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {conversation.availableThreads.map((thread) => (
              <ThreadChip
                key={thread.id}
                thread={thread}
                selected={conversation.thread?.id === thread.id}
                onSelect={() => setConversationThread(conversation.id, thread)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending attachments preview */}
      {pendingAttachments.length > 0 && (
        <div className="px-4 pb-1 flex gap-2 flex-wrap flex-shrink-0">
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1 text-xs text-gray-700 max-w-[160px]"
            >
              <DocumentText size={13} />
              <span className="truncate">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="text-gray-400 hover:text-red-400 ml-0.5 flex-shrink-0"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <div className="flex items-end gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white focus-within:border-[#0D9488] transition-colors">
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-[#0D9488] transition-colors flex-shrink-0 mb-0.5"
            aria-label="Add attachment"
            type="button"
          >
            <Add size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            onChange={handleFileChange}
          />

          {/* Text input */}
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent max-h-24 min-h-[20px]"
            placeholder="Type here..."
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // auto-grow
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!text.trim() && pendingAttachments.length === 0}
            className={cn(
              "flex-shrink-0 mb-0.5 transition-colors",
              text.trim() || pendingAttachments.length > 0
                ? "text-[#0D9488]"
                : "text-gray-300"
            )}
            aria-label="Send message"
            type="button"
          >
            <Send2 size={20} variant="Bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Thread chip ───────────────────────────────────────────────

function ThreadChip({
  thread,
  selected,
  onSelect,
}: {
  thread: VendorThread;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
        selected
          ? "bg-[#0D9488] border-[#0D9488] text-white"
          : "border-gray-200 text-gray-600 hover:border-[#0D9488] hover:text-[#0D9488]"
      )}
    >
      {thread.label}
    </button>
  );
}