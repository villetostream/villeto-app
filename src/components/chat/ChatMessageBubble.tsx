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
        <span className="text-[11px] text-gray-500 font-medium px-1">
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
            "px-3 py-2 rounded-2xl text-sm leading-relaxed",
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-gray-100 text-gray-900 rounded-tl-sm"
          )}
        >
          {message.content}
        </div>
      )}

      {/* Timestamp */}
      <span className="text-[10px] text-gray-400 px-1">
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
        <div className="relative w-48 h-32 rounded-xl overflow-hidden border border-gray-200">
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
        "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm max-w-[200px]",
        isOwn
          ? "border-primary/80 bg-primary/95 text-primary-foreground"
          : "border-gray-200 bg-white text-gray-800"
      )}
    >
      <DocumentText size={18} className="flex-shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="truncate text-xs font-medium">{attachment.name}</span>
        <span className="text-[10px] opacity-70">{formatFileSize(attachment.size)}</span>
      </div>
    </a>
  );
}