import { sanitizeExternalHttpUrl } from "./url";

/**
 * Safe MIME & URL handling for client-side attachment previews and images.
 * Prevents Stored XSS via active document MIME types (HTML, SVG, XML, JS)
 * rendered inside same-origin blob: URLs or data: URLs.
 */

export const SAFE_INLINE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/avif",
]);

export const SAFE_INLINE_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
]);

const ACTIVE_OR_EXECUTABLE_EXTENSIONS = new Set([
  "svg",
  "svgz",
  "html",
  "htm",
  "xhtml",
  "xht",
  "xml",
  "js",
  "mjs",
  "cjs",
  "swf",
]);

function normalizeMime(mimeType?: string | null): string {
  if (!mimeType || typeof mimeType !== "string") return "";
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function getFileExtension(filename?: string | null): string {
  if (!filename || typeof filename !== "string") return "";
  const clean = filename.split(/[?#]/)[0]?.trim() ?? "";
  const lastDot = clean.lastIndexOf(".");
  if (lastDot < 0 || lastDot === clean.length - 1) return "";
  return clean.slice(lastDot + 1).toLowerCase();
}

export function isSafeRasterImageMime(
  mimeType?: string | null,
  filename?: string | null,
): boolean {
  const ext = getFileExtension(filename);
  if (ext && ACTIVE_OR_EXECUTABLE_EXTENSIONS.has(ext)) {
    return false;
  }
  const normalized = normalizeMime(mimeType);
  if (!normalized) {
    return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"].includes(ext);
  }
  return SAFE_INLINE_IMAGE_MIME_TYPES.has(normalized);
}

/**
 * Returns true only for passive media types safe to preview inside the application
 * (PDF and non-SVG raster images). Blocks text/html, image/svg+xml, XML, and scripts.
 */
export function isSafeInlinePreviewMime(
  mimeType?: string | null,
  filename?: string | null,
): boolean {
  const ext = getFileExtension(filename);
  if (ext && ACTIVE_OR_EXECUTABLE_EXTENSIONS.has(ext)) {
    return false;
  }

  const normalized = normalizeMime(mimeType);
  if (!normalized) {
    return (
      ext === "pdf" ||
      ["jpg", "jpeg", "png", "gif", "webp", "bmp", "avif"].includes(ext)
    );
  }

  return (
    normalized === "application/pdf" ||
    SAFE_INLINE_IMAGE_MIME_TYPES.has(normalized)
  );
}

/**
 * Creates a Blob whose MIME type is downgraded to application/octet-stream
 * unless it is verified safe for passive inline preview (PDF or raster image).
 * This ensures active payloads (HTML/SVG/JS) cannot execute script if opened.
 */
export function createSafeAttachmentPreviewBlob(
  data: BlobPart,
  mimeType?: string | null,
  filename?: string | null,
): {
  blob: Blob;
  canPreviewInline: boolean;
  safeMimeType: string;
} {
  const normalized = normalizeMime(mimeType);
  const canPreviewInline = isSafeInlinePreviewMime(normalized, filename);
  const safeMimeType = canPreviewInline
    ? normalized ||
      (getFileExtension(filename) === "pdf"
        ? "application/pdf"
        : "application/octet-stream")
    : "application/octet-stream";

  return {
    blob: new Blob([data], { type: safeMimeType }),
    canPreviewInline: canPreviewInline && safeMimeType !== "application/octet-stream",
    safeMimeType,
  };
}

/**
 * Validates URLs before calling window.open, enforcing noopener,noreferrer.
 * Permits blob: URLs (which must already be created safely) and HTTP(S) URLs.
 */
export function openSafeUrlInNewTab(rawUrl?: string | null): boolean {
  if (typeof rawUrl !== "string" || typeof window === "undefined") return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("blob:")) {
    window.open(trimmed, "_blank", "noopener,noreferrer");
    return true;
  }

  const safeHttp = sanitizeExternalHttpUrl(trimmed, {
    allowHttp: true,
    allowHttpLocalhost: true,
  });
  if (!safeHttp) return false;

  window.open(safeHttp, "_blank", "noopener,noreferrer");
  return true;
}

const SAFE_DATA_IMAGE_REGEX =
  /^data:image\/(png|jpe?g|gif|webp|bmp);base64,[a-zA-Z0-9+/=\s]+$/i;

/**
 * Validates receipt/avatar image URLs and data URIs, blocking SVG/HTML data URLs
 * and javascript: URIs.
 */
export function sanitizeImageSrc(src?: string | null): string {
  if (!src || typeof src !== "string") return "";
  const trimmed = src.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("data:")) {
    return SAFE_DATA_IMAGE_REGEX.test(trimmed) ? trimmed : "";
  }

  if (trimmed.startsWith("blob:")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") || trimmed.startsWith("/\\") ? "" : trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return (
      sanitizeExternalHttpUrl(trimmed, {
        allowHttp: true,
        allowHttpLocalhost: true,
      }) ?? ""
    );
  }

  // Raw base64 fallback (strict base64 characters only)
  if (/^[a-zA-Z0-9+/=\s]+$/.test(trimmed)) {
    return `data:image/jpeg;base64,${trimmed}`;
  }

  return "";
}
