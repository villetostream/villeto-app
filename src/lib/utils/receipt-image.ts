import { sanitizeImageSrc } from "@/lib/security/blob-preview";

/** Normalize receipt sources (URL, data URL, or raw base64) for image display. */
export function normalizeReceiptSrc(src?: string | null): string {
  return sanitizeImageSrc(src);
}

export function hasReceiptSrc(src?: string | null): boolean {
  return normalizeReceiptSrc(src).length > 0;
}
