/**
 * Safe URL validation and sanitization helpers to prevent open redirects,
 * protocol-relative redirects, and javascript:/data:/vbscript: URI execution.
 */

const DEFAULT_ALLOWED_OAUTH_HOSTS = [
  "accounts.google.com",
  "oauth2.googleapis.com",
];

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

function hostMatchesAllowlist(hostname: string, allowlist: string[]): boolean {
  const normalized = normalizeHost(hostname);
  return allowlist.some((allowed) => {
    const target = normalizeHost(allowed);
    if (!target) return false;
    return normalized === target || normalized.endsWith(`.${target}`);
  });
}

export interface ExternalUrlOptions {
  allowedHosts?: string[];
  allowHttpLocalhost?: boolean;
  allowHttp?: boolean;
}

/**
 * Parses and validates an external HTTP/HTTPS URL.
 * Rejects dangerous schemes (javascript:, data:, vbscript:, file:),
 * embedded credentials (user:pass@host), and optionally enforces an explicit host allowlist.
 */
export function sanitizeExternalHttpUrl(
  rawUrl?: string | null,
  options: ExternalUrlOptions = {},
): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  // Reject embedded credentials that could spoof target domains
  if (parsed.username || parsed.password) {
    return null;
  }

  const isLocalhost =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

  const protocolAllowed =
    parsed.protocol === "https:" ||
    (parsed.protocol === "http:" &&
      (options.allowHttp === true ||
        (options.allowHttpLocalhost !== false && isLocalhost)));

  if (!protocolAllowed) {
    return null;
  }

  if (options.allowedHosts && options.allowedHosts.length > 0) {
    if (!hostMatchesAllowlist(parsed.hostname, options.allowedHosts)) {
      return null;
    }
  }

  return parsed.toString();
}

/**
 * Validates OAuth authorization redirect URLs returned by the backend
 * (e.g., Google Mailbox OAuth consent screen) prior to top-level navigation.
 */
export function isSafeOAuthAuthorizationUrl(
  rawUrl?: string | null,
  allowedHosts: string[] = DEFAULT_ALLOWED_OAUTH_HOSTS,
): string | null {
  return sanitizeExternalHttpUrl(rawUrl, {
    allowedHosts,
    allowHttpLocalhost: false,
    allowHttp: false,
  });
}

/**
 * Sanitizes navigation href values (such as notification actionUrl or inspection links).
 * Allows relative paths starting with a single '/' (rejecting '//' protocol-relative URLs),
 * '#' fragments, or validated HTTP(S) URLs. Rejects javascript:, data:, vbscript:, etc.
 */
export function sanitizeNavigationHref(rawUrl?: string | null): string | null {
  if (typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Allow safe internal path or fragment only (block protocol-relative '//evil.com' and '/\evil')
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
      return null;
    }
    return trimmed;
  }

  if (trimmed.startsWith("#")) {
    return trimmed;
  }

  return sanitizeExternalHttpUrl(trimmed, {
    allowHttp: true,
    allowHttpLocalhost: true,
  });
}
