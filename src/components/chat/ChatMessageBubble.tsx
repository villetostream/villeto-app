"use client";

/**
 * ChatMessageBubble
 * Renders a single chat message with:
 *  - sender label (hidden when consecutive same sender)
 *  - text content
 *  - attachments (image preview or file chip)
 *  - timestamp (hh:mm AA)
 */

import { ChatMessage, Attachment } from "@/stores/useChatStore";
import { formatTime, formatFileSize } from "./chat-utils";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { DocumentText } from "iconsax-reactjs";

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  showSender?: boolean;
}

export function ChatMessageBubble({ message, isOwn, showSender = true }: Props) {
  return (
    <div className={cn("flex flex-col gap-0.5 max-w-[78%]", isOwn && "self-end items-end")}>
      {showSender && !isOwn && (
        <span className="text-[11px] text-[#84908a] font-medium px-1">
          {message.senderName}
        </span>
      )}

      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {message.attachments.map((att) => (
            <AttachmentPreview key={att.id} attachment={att} isOwn={isOwn} />
          ))}
        </div>
      )}

      {/* Text */}
      {message.content && (
        <div
          className={cn(
            "px-3.5 py-2.5 rounded-[16px] text-[13px] leading-relaxed",
            isOwn
              ? "bg-[#0ea894] text-white rounded-tr-[4px] shadow-sm"
              : "bg-[#f5f7f6] text-[#0b100e] border border-black/[0.04] rounded-tl-[4px]"
          )}
        >
          {message.content}
        </div>
      )}

      {/* Timestamp */}
      <span className="text-[10px] text-[#84908a] px-1">
        {formatTime(message.timestamp)}
      </span>
    </div>
  );
}

function AttachmentPreview({
  attachment,
  isOwn,
}: {
  attachment: Attachment;
  isOwn: boolean;
}) {
  if (attachment.type === "image") {
    return (
      <a href={attachment.url} target="_blank" rel="noreferrer">
        <div className="relative w-48 h-32 rounded-[12px] overflow-hidden border border-black/[0.08]">
          <Image
            src={attachment.url}
            alt={attachment.name}
            fill
            className="object-cover"
          />
        </div>
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      download={attachment.name}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-[12px] border text-[13px] max-w-[200px]",
        isOwn
          ? "border-[#0ea894]/80 bg-[#0ea894]/95 text-white"
          : "border-black/[0.08] bg-white text-[#0b100e]"
      )}
    >
      <DocumentText size={18} className="flex-shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="truncate text-[12px] font-medium">{attachment.name}</span>
        <span className="text-[10px] opacity-70">{formatFileSize(attachment.size)}</span>
      </div>
    </a>
  );
}