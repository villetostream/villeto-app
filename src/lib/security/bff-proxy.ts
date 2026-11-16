import {
  BFF_ACCESS_COOKIE_NAME,
  sealBffSession,
  serializeAccessSessionCookie,
  serializeClearAccessSessionCookie,
  shouldUseSecureCookie,
  unsealBffSession,
} from "./bff-session";
import {
  AUTH_MARKER_COOKIE_NAME,
  buildAuthMarkerCookie,
  buildClearAuthMarkerCookie,
} from "./auth-cookie";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
  "set-cookie",
]);

/**
 * Resolves the upstream backend API URL from server environment and validates path segments
 * to prevent SSRF or path traversal.
 */
export function buildUpstreamUrl(
  pathSegments: string[],
  search: string = "",
  configuredBaseUrl?: string,
): URL {
  const rawBase = (
    configuredBaseUrl ??
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    ""
  ).trim();

  if (!rawBase) {
    throw new Error("Backend API base URL is not configured");
  }

  const baseUrl = new URL(rawBase);
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    baseUrl.hostname.toLowerCase(),
  );
  if (
    baseUrl.protocol !== "https:" &&
    !(baseUrl.protocol === "http:" && isLoopback)
  ) {
    throw new Error("Upstream API base URL must use HTTPS");
  }

  const sanitizedSegments: string[] = [];
  for (const segment of pathSegments) {
    if (!segment) continue;

    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new Error("Malformed path segment");
    }

    if (
      segment === "." ||
      segment === ".." ||
      decoded === "." ||
      decoded === ".." ||
      decoded.includes("/") ||
      decoded.includes("\\") ||
      decoded.includes("\0") ||
      decoded.includes("..") ||
      /[\r\n]/.test(decoded)
    ) {
      throw new Error("Unsafe path segment");
    }

    sanitizedSegments.push(encodeURIComponent(decoded));
  }

  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  const joinedPath = sanitizedSegments.length
    ? `${basePath}/${sanitizedSegments.join("/")}`
    : basePath || "/";

  const upstream = new URL(joinedPath, baseUrl.origin);
  if (upstream.origin !== baseUrl.origin) {
    throw new Error("Upstream origin mismatch");
  }

  if (search) {
    upstream.search = search.startsWith("?") ? search : `?${search}`;
  }

  return upstream;
}

/**
 * Validates same-origin CSRF invariants for cookie-authenticated mutations.
 */
export function isTrustedSameOriginRequest(
  method: string,
  headers: Headers,
  requestUrl?: string,
): boolean {
  if (!UNSAFE_METHODS.has(method.toUpperCase())) {
    return true;
  }

  const secFetchSite = headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (secFetchSite === "cross-site") {
    return false;
  }

  const expectedHost = (
    headers.get("x-forwarded-host") ||
    headers.get("host") ||
    (requestUrl ? new URL(requestUrl).host : "")
  )
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (!expectedHost) {
    return false;
  }

  const allowedHosts = new Set([expectedHost]);
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl) {
    try {
      allowedHosts.add(new URL(configuredAppUrl).host.toLowerCase());
    } catch {
      // Ignore malformed optional NEXT_PUBLIC_APP_URL.
    }
  }

  const origin = headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (
        originUrl.protocol !== "http:" &&
        originUrl.protocol !== "https:"
      ) {
        return false;
      }
      return allowedHosts.has(originUrl.host.toLowerCase());
    } catch {
      return false;
    }
  }

  const referer = headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return allowedHosts.has(refererUrl.host.toLowerCase());
    } catch {
      return false;
    }
  }

  return secFetchSite === "same-origin" || !secFetchSite;
}

/**
 * Rewrites upstream Set-Cookie headers so refresh cookies become host-only on the BFF origin.
 */
export function rewriteUpstreamSetCookie(
  rawCookie: string,
  isHttps: boolean,
): string {
  const parts = rawCookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return rawCookie;

  const [nameValue, ...attributes] = parts;
  const rewritten: string[] = [nameValue];
  let hasPath = false;

  for (const attr of attributes) {
    const lower = attr.toLowerCase();
    if (lower.startsWith("domain=")) {
      continue;
    }
    if (lower.startsWith("path=")) {
      hasPath = true;
      rewritten.push("Path=/");
      continue;
    }
    if (lower === "secure") {
      if (isHttps) rewritten.push("Secure");
      continue;
    }
    if (lower.startsWith("samesite=")) {
      if (lower === "samesite=none") {
        rewritten.push("SameSite=Lax");
      } else {
        rewritten.push(attr);
      }
      continue;
    }
    rewritten.push(attr);
  }

  if (!hasPath) {
    rewritten.push("Path=/");
  }
  if (isHttps && !rewritten.some((a) => a.toLowerCase() === "secure")) {
    rewritten.push("Secure");
  }

  return rewritten.join("; ");
}

function extractJwtSubject(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { sub?: unknown };
    return typeof parsed?.sub === "string" && parsed.sub.length > 0
      ? parsed.sub
      : null;
  } catch {
    return null;
  }
}

/**
 * Extracts and removes raw accessToken fields from login/refresh JSON payloads
 * so browser JavaScript never handles raw bearer JWTs.
 */
export function stripAccessTokenFromPayload(payload: unknown): {
  sanitized: unknown;
  accessToken: string | null;
  expiresInMs: number;
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { sanitized: payload, accessToken: null, expiresInMs: 3_600_000 };
  }

  const clone = structuredClone(payload) as Record<string, unknown>;
  const dataObj =
    clone.data && typeof clone.data === "object" && !Array.isArray(clone.data)
      ? (clone.data as Record<string, unknown>)
      : null;

  const nestedDataObj =
    dataObj?.data &&
    typeof dataObj.data === "object" &&
    !Array.isArray(dataObj.data)
      ? (dataObj.data as Record<string, unknown>)
      : null;

  let accessToken: string | null = null;
  let expiresInMs = 3_600_000;

  for (const container of [nestedDataObj, dataObj, clone]) {
    if (!container) continue;
    if (!accessToken && typeof container.accessToken === "string" && container.accessToken) {
      accessToken = container.accessToken;
    }
    if (
      typeof container.accessTokenExpiresInMs === "number" &&
      Number.isFinite(container.accessTokenExpiresInMs) &&
      container.accessTokenExpiresInMs > 0
    ) {
      expiresInMs = container.accessTokenExpiresInMs;
    }
    if ("accessToken" in container) {
      delete container.accessToken;
    }
  }

  if (accessToken) {
    const subject = extractJwtSubject(accessToken);
    if (dataObj) {
      dataObj.authenticated = true;
      if (subject && typeof dataObj.userId !== "string") {
        dataObj.userId = subject;
      }
    } else {
      clone.authenticated = true;
      if (subject && typeof clone.userId !== "string") {
        clone.userId = subject;
      }
    }
  }

  return { sanitized: clone, accessToken, expiresInMs };
}

function buildUpstreamCookieHeader(rawCookieHeader: string | null): string | null {
  if (!rawCookieHeader) return null;

  const filtered = rawCookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const eqIdx = part.indexOf("=");
      const name = (eqIdx >= 0 ? part.slice(0, eqIdx) : part).trim();
      return (
        name !== BFF_ACCESS_COOKIE_NAME && name !== AUTH_MARKER_COOKIE_NAME
      );
    });

  return filtered.length > 0 ? filtered.join("; ") : null;
}

function getSetCookiesFromHeaders(headers: Headers): string[] {
  const maybeGetSetCookie = (
    headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  if (typeof maybeGetSetCookie === "function") {
    return maybeGetSetCookie.call(headers);
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    if (trimmed.slice(0, eqIdx).trim() === name) {
      return trimmed.slice(eqIdx + 1);
    }
  }
  return null;
}

function copySafeUpstreamResponseHeaders(
  upstreamHeaders: Headers,
  isHttps: boolean,
): Headers {
  const out = new Headers();
  upstreamHeaders.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      out.set(key, value);
    }
  });

  for (const rawSetCookie of getSetCookiesFromHeaders(upstreamHeaders)) {
    out.append("set-cookie", rewriteUpstreamSetCookie(rawSetCookie, isHttps));
  }

  if (out.get("content-type")?.includes("text/event-stream")) {
    out.set("cache-control", "no-cache, no-transform");
    out.set("x-accel-buffering", "no");
  }

  return out;
}

export interface BffProxyRequestLike {
  method: string;
  url: string;
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
  signal?: AbortSignal;
}

/**
 * Proxies a browser request to the upstream backend API via the Next.js BFF,
 * managing the sealed HttpOnly access cookie and CSRF invariants.
 */
export async function handleBffProxyRequest(
  request: BffProxyRequestLike,
  pathSegments: string[],
): Promise<Response> {
  if (!isTrustedSameOriginRequest(request.method, request.headers, request.url)) {
    return Response.json(
      { message: "Cross-origin state-changing request rejected" },
      { status: 403 },
    );
  }

  let upstreamUrl: URL;
  try {
    const reqUrl = new URL(request.url, "http://localhost");
    upstreamUrl = buildUpstreamUrl(pathSegments, reqUrl.search);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid BFF target path";
    const status = message.includes("configured") ? 500 : 400;
    return Response.json({ message }, { status });
  }

  const isHttps = shouldUseSecureCookie(request.headers, request.url);
  const routeKey = pathSegments
    .filter(Boolean)
    .map((s) => s.toLowerCase())
    .join("/");
  const isLoginOrRefresh =
    routeKey === "auth/login" || routeKey === "auth/refresh";
  const isLogout = routeKey === "auth/logout";

  const upstreamHeaders = new Headers();
  for (const headerName of [
    "accept",
    "content-type",
    "x-villeto-legal-entity",
    "x-request-id",
    "cache-control",
    "if-none-match",
    "if-modified-since",
  ]) {
    const value = request.headers.get(headerName);
    if (value) upstreamHeaders.set(headerName, value);
  }

  const rawCookies = request.headers.get("cookie");
  const upstreamCookieHeader = buildUpstreamCookieHeader(rawCookies);
  if (upstreamCookieHeader) {
    upstreamHeaders.set("cookie", upstreamCookieHeader);
  }

  const sealedCookie = parseCookieValue(rawCookies, BFF_ACCESS_COOKIE_NAME);
  const session = unsealBffSession(sealedCookie);
  if (session && !isLoginOrRefresh) {
    upstreamHeaders.set("authorization", `Bearer ${session.token}`);
  }

  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method) && request.body !== null;

  let upstreamResponse: Response;
  try {
    const fetchInit: RequestInit & { duplex?: "half" } = {
      method,
      headers: upstreamHeaders,
      redirect: "manual",
      signal: request.signal,
    };
    if (hasBody) {
      fetchInit.body = request.body;
      fetchInit.duplex = "half";
    }
    upstreamResponse = await fetch(upstreamUrl, fetchInit);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    return Response.json(
      { message: "Upstream service temporarily unavailable" },
      { status: 502 },
    );
  }

  const responseHeaders = copySafeUpstreamResponseHeaders(
    upstreamResponse.headers,
    isHttps,
  );

  if (isLogout) {
    responseHeaders.append("set-cookie", serializeClearAccessSessionCookie(isHttps));
    responseHeaders.append("set-cookie", buildClearAuthMarkerCookie(isHttps));
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  if (isLoginOrRefresh) {
    const contentType = responseHeaders.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if (!upstreamResponse.ok) {
        responseHeaders.append(
          "set-cookie",
          serializeClearAccessSessionCookie(isHttps),
        );
      }
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    let parsedJson: unknown;
    try {
      parsedJson = await upstreamResponse.json();
    } catch {
      return Response.json(
        { message: "Invalid JSON response from authentication server" },
        { status: 502 },
      );
    }

    const { sanitized, accessToken, expiresInMs } =
      stripAccessTokenFromPayload(parsedJson);

    if (upstreamResponse.ok && accessToken) {
      const sealed = sealBffSession(accessToken, expiresInMs);
      responseHeaders.append(
        "set-cookie",
        serializeAccessSessionCookie(sealed, expiresInMs, isHttps),
      );
      responseHeaders.append(
        "set-cookie",
        buildAuthMarkerCookie(expiresInMs, isHttps),
      );
    } else if (!upstreamResponse.ok) {
      responseHeaders.append(
        "set-cookie",
        serializeClearAccessSessionCookie(isHttps),
      );
    }

    return Response.json(sanitized, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
