import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BFF_ACCESS_COOKIE_NAME,
  sealBffSession,
  unsealBffSession,
} from "./bff-session";
import {
  buildUpstreamUrl,
  handleBffProxyRequest,
  isTrustedSameOriginRequest,
  rewriteUpstreamSetCookie,
  stripAccessTokenFromPayload,
} from "./bff-proxy";
import {
  optionalWorkspaceDetail,
  reportReviewRoute,
  workspaceDetailRoute,
  workspaceRoute,
} from "@/features/entity-workspace/transport";

const TEST_SECRET = "unit-test-bff-session-secret-0123456789abcdef";

describe("BFF sealed session cookies", () => {
  it("seals and unseals bearer tokens with AES-256-GCM", () => {
    const now = 1_700_000_000_000;
    const sealed = sealBffSession("jwt.header.sig", 60_000, now, TEST_SECRET);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("jwt.header.sig");

    const unsealed = unsealBffSession(sealed, now + 10_000, TEST_SECRET);
    expect(unsealed).toEqual({
      token: "jwt.header.sig",
      exp: now + 60_000,
    });
  });

  it("rejects tampered, wrong-key, or expired sealed cookies", () => {
    const now = 1_700_000_000_000;
    const sealed = sealBffSession("jwt.header.sig", 60_000, now, TEST_SECRET);

    const parts = sealed.split(".");
    const tampered = [parts[0], parts[1], parts[2], `${parts[3].slice(0, -1)}A`].join(".");
    expect(unsealBffSession(tampered, now + 1000, TEST_SECRET)).toBeNull();
    expect(unsealBffSession(sealed, now + 1000, "wrong-secret-0123456789abcdef")).toBeNull();
    expect(unsealBffSession(sealed, now + 60_001, TEST_SECRET)).toBeNull();
  });

  it("fails closed in production when BFF_SESSION_SECRET is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BFF_SESSION_SECRET", "");
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => sealBffSession("jwt.secret", 60_000)).toThrow(
      /BFF_SESSION_SECRET/,
    );
    vi.unstubAllEnvs();
  });
});

describe("BFF proxy SSRF, CSRF, cookie rewriting, and JWT stripping", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects path traversal and unsafe schemes when building upstream URLs", () => {
    expect(() =>
      buildUpstreamUrl(["..", "admin"], "", "https://api.villeto.com"),
    ).toThrow(/Unsafe path segment/);
    expect(() =>
      buildUpstreamUrl(["foo%2f..%2fbar"], "", "https://api.villeto.com"),
    ).toThrow(/Unsafe path segment/);
    expect(() =>
      buildUpstreamUrl(["reports"], "", "http://api.villeto.com"),
    ).toThrow(/HTTPS/);

    const valid = buildUpstreamUrl(
      ["reports", "abc-123"],
      "?scope=company",
      "https://api.villeto.com/v1",
    );
    expect(valid.toString()).toBe(
      "https://api.villeto.com/v1/reports/abc-123?scope=company",
    );
  });

  it("enforces same-origin CSRF checks on unsafe methods", () => {
    const crossSiteHeaders = new Headers({
      host: "app.villeto.com",
      origin: "https://evil.example",
      "sec-fetch-site": "cross-site",
    });
    expect(isTrustedSameOriginRequest("POST", crossSiteHeaders)).toBe(false);
    expect(isTrustedSameOriginRequest("GET", crossSiteHeaders)).toBe(true);

    const nullOriginHeaders = new Headers({
      host: "app.villeto.com",
      origin: "null",
    });
    expect(isTrustedSameOriginRequest("DELETE", nullOriginHeaders)).toBe(false);

    const sameOriginHeaders = new Headers({
      host: "localhost:3006",
      origin: "http://localhost:3006",
      "sec-fetch-site": "same-origin",
    });
    expect(isTrustedSameOriginRequest("POST", sameOriginHeaders)).toBe(true);
  });

  it("strips Domain and preserves HttpOnly when rewriting upstream Set-Cookie", () => {
    const rewrittenHttp = rewriteUpstreamSetCookie(
      "refresh_token=abc; Domain=api.villeto.com; Path=/auth; HttpOnly; Secure; SameSite=None",
      false,
    );
    expect(rewrittenHttp).toContain("refresh_token=abc");
    expect(rewrittenHttp).not.toContain("Domain=");
    expect(rewrittenHttp).toContain("HttpOnly");
    expect(rewrittenHttp).toContain("SameSite=Lax");
    expect(rewrittenHttp).not.toContain("Secure");

    const rewrittenHttps = rewriteUpstreamSetCookie(
      "refresh_token=abc; Domain=api.villeto.com; HttpOnly; SameSite=None",
      true,
    );
    expect(rewrittenHttps).toContain("Secure");
    expect(rewrittenHttps).not.toContain("Domain=");
  });

  it("strips raw accessToken values from login/refresh JSON payloads", () => {
    const { sanitized, accessToken, expiresInMs } = stripAccessTokenFromPayload({
      status: 200,
      data: {
        accessToken: "secret-jwt-value",
        accessTokenExpiresInMs: 1800000,
        user: { userId: "u-1" },
      },
    });
    expect(accessToken).toBe("secret-jwt-value");
    expect(expiresInMs).toBe(1800000);
    expect(JSON.stringify(sanitized)).not.toContain("secret-jwt-value");
    expect((sanitized as { data: { authenticated: boolean } }).data.authenticated).toBe(true);
  });

  it("seals login JWT into HttpOnly cookie and injects Bearer on subsequent proxy calls", async () => {
    vi.stubEnv("API_BASE_URL", "https://api.villeto.com");
    vi.stubEnv("BFF_SESSION_SECRET", TEST_SECRET);

    const upstreamCalls: Array<{ url: string; headers: Headers }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const u = url instanceof URL ? url.toString() : String(url);
        const h = new Headers(init?.headers);
        upstreamCalls.push({ url: u, headers: h });

        if (u.endsWith("/auth/login")) {
          const resHeaders = new Headers({
            "content-type": "application/json",
            "set-cookie":
              "refresh_token=r123; Domain=api.villeto.com; Path=/; HttpOnly; Secure; SameSite=None",
          });
          return new Response(
            JSON.stringify({
              status: 200,
              data: {
                accessToken: "raw-backend-jwt",
                accessTokenExpiresInMs: 3600000,
                user: { userId: "u-1" },
              },
            }),
            { status: 200, headers: resHeaders },
          );
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const loginRes = await handleBffProxyRequest(
      {
        method: "POST",
        url: "http://localhost:3006/api/bff/auth/login",
        headers: new Headers({
          host: "localhost:3006",
          origin: "http://localhost:3006",
          "content-type": "application/json",
        }),
        body: new Blob(['{"email":"a@b.com"}']).stream(),
      },
      ["auth", "login"],
    );

    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as {
      data: { accessToken?: string; authenticated?: boolean };
    };
    expect(loginBody.data.accessToken).toBeUndefined();
    expect(loginBody.data.authenticated).toBe(true);

    const setCookies = loginRes.headers.getSetCookie();
    const accessCookie = setCookies.find((c) =>
      c.startsWith(`${BFF_ACCESS_COOKIE_NAME}=`),
    );
    expect(accessCookie).toBeDefined();
    expect(accessCookie).toContain("HttpOnly");
    expect(accessCookie).toContain("SameSite=Lax");
    const cookiePair = accessCookie!.split(";")[0];

    const apiRes = await handleBffProxyRequest(
      {
        method: "GET",
        url: "http://localhost:3006/api/bff/bill-pay/invoices",
        headers: new Headers({
          host: "localhost:3006",
          cookie: `${cookiePair}; refresh_token=r123; villeto_auth=true`,
          "x-villeto-legal-entity": "ent-1",
        }),
        body: null,
      },
      ["bill-pay", "invoices"],
    );

    expect(apiRes.status).toBe(200);
    expect(upstreamCalls[1].headers.get("authorization")).toBe(
      "Bearer raw-backend-jwt",
    );
    expect(upstreamCalls[1].headers.get("x-villeto-legal-entity")).toBe("ent-1");
    expect(upstreamCalls[1].headers.get("cookie")).toBe("refresh_token=r123");
  });

  it("matches entity workspace routes cleanly through the /api/bff prefix", () => {
    expect(workspaceRoute("/api/bff/bill-pay/invoices", "GET")).toBe(true);
    expect(workspaceDetailRoute("/api/bff/bill-pay/invoices/inv-1")).toBe(true);
    expect(optionalWorkspaceDetail("/api/bff/reports/rep-1", "GET")).toBe(true);
    expect(reportReviewRoute("/api/bff/reports?scope=company")).toBe(true);
    expect(reportReviewRoute("/api/bff/reports?scope=own")).toBe(false);
  });
});
