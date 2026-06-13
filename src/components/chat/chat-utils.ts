import { ChatMessage } from "@/stores/useChatStore";
import { format, isToday, isYesterday } from "date-fns";

// ─── Date grouping ─────────────────────────────────────────────

export type MessageGroup = {
  label: string; // "Today", "Yesterday", "Mon, 12 Dec 2025", etc.
  messages: ChatMessage[];
};

export function groupMessagesByDate(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const msg of messages) {
    const date = new Date(msg.timestamp);

    let label: string;
    if (isToday(date)) {
      label = "Today";
    } else if (isYesterday(date)) {
      label = "Yesterday";
    } else {
      label = format(date, "EEE, d MMM yyyy");
    }

    const existing = groups.find((g) => g.label === label);
    if (existing) {
      existing.messages.push(msg);
    } else {
      groups.push({ label, messages: [msg] });
    }
  }

  return groups;
}

// ─── Time display ──────────────────────────────────────────────

/** Formats a timestamp as "11:00 AM" */
export function formatTime(date: Date): string {
  return format(new Date(date), "h:mm aa");
}

/** Formats full date + time: "21/12/2025, 2:30pm" */
export function formatFullDateTime(date: Date): string {
  return format(new Date(date), "dd/MM/yyyy, h:mmaaa");
}

// ─── File utilities ────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageFile(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

export function createAttachmentFromFile(file: File) {
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    url: URL.createObjectURL(file),
    type: (isImageFile(file.name) ? "image" : "file") as "image" | "file",
    size: file.size,
  };
}