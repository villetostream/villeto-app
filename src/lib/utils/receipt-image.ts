/** Normalize receipt sources (URL, data URL, or raw base64) for image display. */
export function normalizeReceiptSrc(src?: string | null): string {
  if (!src) return "";
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return `data:image/jpeg;base64,${trimmed}`;
}

export function hasReceiptSrc(src?: string | null): boolean {
  return normalizeReceiptSrc(src).length > 0;
}
