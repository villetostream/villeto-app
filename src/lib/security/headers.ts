export interface SecurityHeaderOptions {
  isProd?: boolean;
  isPublicPath?: boolean;
  apiBaseUrl?: string;
}

export function buildContentSecurityPolicy(
  options: Pick<SecurityHeaderOptions, "isProd" | "apiBaseUrl"> = {},
): string {
  const isProd = options.isProd ?? process.env.NODE_ENV === "production";
  const connectSources = ["'self'", "https:"];
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (apiBaseUrl) {
    try {
      const parsed = new URL(apiBaseUrl);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        connectSources.push(parsed.origin);
      }
    } catch {
      // Invalid API URLs are handled by the API client; keep the CSP restrictive.
    }
  }

  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ") + ";";
}

export function getSecurityHeaders(
  options: SecurityHeaderOptions = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security":
      "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Content-Security-Policy": buildContentSecurityPolicy(options),
  };

  if (options.isPublicPath === false) {
    headers["Cache-Control"] = "no-store, private";
  }

  return headers;
}
