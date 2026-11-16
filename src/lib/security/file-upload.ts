/**
 * Client-side file upload validation and prototype-safe row sanitization helpers.
 * Note: Server-side magic-byte inspection and malware scanning remain required
 * on the backend API (`villeto-monolith`).
 */

export const SAFE_RASTER_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

export const SAFE_RASTER_IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
]);

export const SPREADSHEET_EXTENSIONS = new Set(["csv", "xlsx", "xls"]);

export const DANGEROUS_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

function extractExtension(filename: string): string {
  const clean = filename.trim();
  const idx = clean.lastIndexOf(".");
  if (idx < 0 || idx === clean.length - 1) return "";
  return clean.slice(idx + 1).toLowerCase();
}

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

export type FileValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * Validates raster image uploads (avatars, company logos, receipt photos).
 * Rejects SVG (`image/svg+xml`) by default to prevent stored SVG script injection.
 */
export function validateRasterImageFile(
  file: FileLike,
  maxSizeBytes = 5 * 1024 * 1024,
): FileValidationResult {
  if (!file || !file.name) {
    return { valid: false, error: "Invalid file selected." };
  }
  if (file.size <= 0) {
    return { valid: false, error: "Selected file is empty." };
  }
  if (file.size > maxSizeBytes) {
    const maxMb = Math.max(1, Math.round(maxSizeBytes / (1024 * 1024)));
    return { valid: false, error: `File too large. Maximum ${maxMb} MB allowed.` };
  }

  const ext = extractExtension(file.name);
  const mime = (file.type || "").split(";")[0].trim().toLowerCase();

  if (ext === "svg" || ext === "svgz" || mime === "image/svg+xml") {
    return {
      valid: false,
      error: "SVG images are not supported for security reasons. Please upload PNG, JPG, GIF, or WEBP.",
    };
  }

  if (!SAFE_RASTER_IMAGE_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: "Unsupported image format. Please upload PNG, JPG, JPEG, GIF, or WEBP.",
    };
  }

  if (mime && !SAFE_RASTER_IMAGE_MIMES.has(mime)) {
    return {
      valid: false,
      error: "Unsupported image MIME type. Please upload PNG, JPG, JPEG, GIF, or WEBP.",
    };
  }

  return { valid: true };
}

/**
 * Validates spreadsheet uploads (CSV, XLS, XLSX) before client-side parsing.
 */
export function validateSpreadsheetFile(
  file: FileLike,
  maxSizeBytes = 15 * 1024 * 1024,
): FileValidationResult {
  if (!file || !file.name) {
    return { valid: false, error: "Invalid file selected." };
  }
  if (file.size <= 0) {
    return { valid: false, error: "Selected file is empty." };
  }
  if (file.size > maxSizeBytes) {
    const maxMb = Math.max(1, Math.round(maxSizeBytes / (1024 * 1024)));
    return { valid: false, error: `File too large. Maximum ${maxMb} MB allowed.` };
  }

  const ext = extractExtension(file.name);
  if (!SPREADSHEET_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload CSV, XLS, or XLSX.",
    };
  }

  return { valid: true };
}

/**
 * Strips prototype-pollution keys (`__proto__`, `constructor`, `prototype`)
 * from parsed spreadsheet/JSON row objects into a clean null-safe object.
 */
export function sanitizePlainObjectRow<T extends Record<string, unknown>>(
  row: T,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  if (!row || typeof row !== "object") return clean;
  for (const key of Object.keys(row)) {
    if (DANGEROUS_OBJECT_KEYS.has(key)) continue;
    clean[key] = row[key];
  }
  return clean;
}
