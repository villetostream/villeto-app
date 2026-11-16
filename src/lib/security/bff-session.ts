import crypto from "node:crypto";

export const BFF_ACCESS_COOKIE_NAME = "villeto_access";
const DEFAULT_ACCESS_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ACCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface BffSessionPayload {
  token: string;
  exp: number;
}

interface SealedEnvelope {
  v: 1;
  t: string;
  exp: number;
}

declare global {
  var __villetoEphemeralBffKey: Buffer | undefined;
}

function deriveKeyFromSecret(secret: string): Buffer {
  return Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      Buffer.from("villeto-bff-session-salt-v1", "utf8"),
      Buffer.from("aes-256-gcm-access-token", "utf8"),
      32,
    ),
  );
}

/**
 * Resolves the 256-bit symmetric sealing key for BFF session cookies.
 * Fails closed in production when BFF_SESSION_SECRET / SESSION_SECRET is absent.
 */
export function resolveBffKey(overrideSecret?: string): Buffer {
  const configured =
    overrideSecret ??
    process.env.BFF_SESSION_SECRET ??
    process.env.SESSION_SECRET;

  if (configured && configured.trim().length > 0) {
    return deriveKeyFromSecret(configured.trim());
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BFF_SESSION_SECRET environment variable must be configured in production",
    );
  }

  if (!globalThis.__villetoEphemeralBffKey) {
    globalThis.__villetoEphemeralBffKey = crypto.randomBytes(32);
  }
  return globalThis.__villetoEphemeralBffKey;
}

/**
 * Encrypts a backend bearer token + expiry into an AES-256-GCM authenticated token string.
 */
export function sealBffSession(
  token: string,
  expiresInMs: number = DEFAULT_ACCESS_TTL_MS,
  nowMs: number = Date.now(),
  overrideSecret?: string,
): string {
  if (!token || typeof token !== "string") {
    throw new Error("Access token must be a non-empty string");
  }

  const safeTtlMs =
    Number.isFinite(expiresInMs) && expiresInMs > 0
      ? Math.min(Math.max(expiresInMs, 1000), MAX_ACCESS_TTL_MS)
      : DEFAULT_ACCESS_TTL_MS;

  const envelope: SealedEnvelope = {
    v: 1,
    t: token,
    exp: nowMs + safeTtlMs,
  };

  const key = resolveBffKey(overrideSecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(envelope), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/**
 * Decrypts and validates a sealed BFF session cookie. Returns null on any tamper or expiry.
 */
export function unsealBffSession(
  sealedValue: string | undefined | null,
  nowMs: number = Date.now(),
  overrideSecret?: string,
): BffSessionPayload | null {
  if (!sealedValue || typeof sealedValue !== "string") {
    return null;
  }

  const parts = sealedValue.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    return null;
  }

  try {
    const iv = Buffer.from(parts[1], "base64url");
    const authTag = Buffer.from(parts[2], "base64url");
    const ciphertext = Buffer.from(parts[3], "base64url");

    if (iv.length !== 12 || authTag.length !== 16 || ciphertext.length === 0) {
      return null;
    }

    const key = resolveBffKey(overrideSecret);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");

    const parsed = JSON.parse(plaintext) as Partial<SealedEnvelope>;
    if (
      parsed.v !== 1 ||
      typeof parsed.t !== "string" ||
      parsed.t.length === 0 ||
      typeof parsed.exp !== "number" ||
      !Number.isFinite(parsed.exp) ||
      parsed.exp <= nowMs
    ) {
      return null;
    }

    return { token: parsed.t, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function shouldUseSecureCookie(
  headers: Headers,
  requestUrl?: string,
): boolean {
  const forwardedProto = headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProto === "https") return true;
  if (forwardedProto === "http") return false;

  if (requestUrl?.startsWith("https://")) return true;
  if (requestUrl?.startsWith("http://localhost") || requestUrl?.startsWith("http://127.0.0.1")) {
    return false;
  }

  const host = (headers.get("x-forwarded-host") || headers.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .split(":")[0];
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

export function serializeAccessSessionCookie(
  sealedValue: string,
  expiresInMs: number,
  isHttps: boolean,
): string {
  const maxAgeSeconds = Math.max(
    1,
    Math.floor(
      (Number.isFinite(expiresInMs) && expiresInMs > 0
        ? Math.min(expiresInMs, MAX_ACCESS_TTL_MS)
        : DEFAULT_ACCESS_TTL_MS) / 1000,
    ),
  );
  const secureFlag = isHttps ? "; Secure" : "";
  return `${BFF_ACCESS_COOKIE_NAME}=${sealedValue}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; SameSite=Lax${secureFlag}`;
}

export function serializeClearAccessSessionCookie(isHttps: boolean): string {
  const secureFlag = isHttps ? "; Secure" : "";
  return `${BFF_ACCESS_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${secureFlag}`;
}
