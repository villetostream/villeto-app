import assert from "node:assert/strict";
import fs from "node:fs";
import module from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, "../..");

// Resolve TypeScript extensionless imports and `@/` alias in Node 24 test runner.
if (typeof module.registerHooks === "function") {
  module.registerHooks({
    resolve(specifier, context, nextResolve) {
      let target = specifier;
      if (target.startsWith("@/")) {
        target = path.resolve(SRC_ROOT, target.slice(2));
      } else if (
        (target.startsWith("./") || target.startsWith("../")) &&
        context.parentURL
      ) {
        const parentDir = path.dirname(fileURLToPath(context.parentURL));
        target = path.resolve(parentDir, target);
      } else {
        return nextResolve(specifier, context);
      }

      for (const candidate of [
        target,
        `${target}.ts`,
        `${target}.tsx`,
        `${target}.mjs`,
        `${target}.js`,
        path.join(target, "index.ts"),
      ]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return {
            url: pathToFileURL(candidate).href,
            shortCircuit: true,
          };
        }
      }
      return nextResolve(specifier, context);
    },
  });
}

const {
  isSafeOAuthAuthorizationUrl,
  sanitizeExternalHttpUrl,
  sanitizeNavigationHref,
} = await import("./url.ts");
const {
  createSafeAttachmentPreviewBlob,
  isSafeInlinePreviewMime,
  isSafeRasterImageMime,
  openSafeUrlInNewTab,
  sanitizeImageSrc,
} = await import("./blob-preview.ts");
const { buildAuthMarkerCookie, buildClearAuthMarkerCookie } = await import(
  "./auth-cookie.ts"
);
const {
  sanitizePlainObjectRow,
  validateRasterImageFile,
  validateSpreadsheetFile,
} = await import("./file-upload.ts");
const { buildContentSecurityPolicy, getSecurityHeaders } = await import(
  "./headers.ts"
);
const { escapeCSVValue, unflatten } = await import("../exportCSV.ts");
const { normalizeReceiptSrc } = await import("../utils/receipt-image.ts");
const { passwordSchema } = await import("../validation/common.ts");

test("URL sanitization blocks open redirects, credentials, and dangerous schemes", () => {
  assert.equal(
    isSafeOAuthAuthorizationUrl(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=123",
    ),
    "https://accounts.google.com/o/oauth2/v2/auth?client_id=123",
  );
  assert.equal(
    isSafeOAuthAuthorizationUrl("http://accounts.google.com/o/oauth2/v2/auth"),
    null,
  );
  assert.equal(
    isSafeOAuthAuthorizationUrl("https://evil.example/accounts.google.com"),
    null,
  );
  assert.equal(
    isSafeOAuthAuthorizationUrl("https://accounts.google.com@evil.example/auth"),
    null,
  );
  assert.equal(isSafeOAuthAuthorizationUrl("javascript:alert(document.domain)"), null);

  assert.equal(sanitizeNavigationHref("/bill-pay/123?tab=overview"), "/bill-pay/123?tab=overview");
  assert.equal(sanitizeNavigationHref("#section"), "#section");
  assert.equal(sanitizeNavigationHref("//evil.example/login"), null);
  assert.equal(sanitizeNavigationHref("/\\evil.example"), null);
  assert.equal(sanitizeNavigationHref("javascript:alert(1)"), null);
  assert.equal(sanitizeNavigationHref("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(
    sanitizeExternalHttpUrl("https://res.cloudinary.com/villeto/image/upload/v1/a.png"),
    "https://res.cloudinary.com/villeto/image/upload/v1/a.png",
  );
});

test("Attachment blob preview downgrades active HTML/SVG/JS MIME types to application/octet-stream", () => {
  assert.equal(isSafeInlinePreviewMime("application/pdf", "invoice.pdf"), true);
  assert.equal(isSafeInlinePreviewMime("image/png", "receipt.png"), true);
  assert.equal(isSafeInlinePreviewMime("text/html", "invoice.html"), false);
  assert.equal(isSafeInlinePreviewMime("image/svg+xml", "logo.svg"), false);
  assert.equal(isSafeInlinePreviewMime("application/xhtml+xml", "doc.xhtml"), false);
  assert.equal(isSafeInlinePreviewMime("image/png", "spoofed.svg"), false);
  assert.equal(isSafeRasterImageMime("image/svg+xml", "logo.svg"), false);
  assert.equal(isSafeRasterImageMime("image/jpeg", "photo.jpg"), true);

  const htmlBlob = createSafeAttachmentPreviewBlob(
    "<script>alert(1)</script>",
    "text/html",
    "evil.html",
  );
  assert.equal(htmlBlob.canPreviewInline, false);
  assert.equal(htmlBlob.safeMimeType, "application/octet-stream");
  assert.equal(htmlBlob.blob.type, "application/octet-stream");

  const svgBlob = createSafeAttachmentPreviewBlob(
    "<svg onload=alert(1)/>",
    "image/svg+xml",
    "evil.svg",
  );
  assert.equal(svgBlob.canPreviewInline, false);
  assert.equal(svgBlob.safeMimeType, "application/octet-stream");

  const pdfBlob = createSafeAttachmentPreviewBlob(
    "%PDF-1.4",
    "application/pdf",
    "invoice.pdf",
  );
  assert.equal(pdfBlob.canPreviewInline, true);
  assert.equal(pdfBlob.safeMimeType, "application/pdf");
});

test("sanitizeImageSrc and normalizeReceiptSrc block SVG/HTML data URIs and javascript:", () => {
  assert.equal(sanitizeImageSrc("data:image/svg+xml;base64,PHN2Zz4="), "");
  assert.equal(normalizeReceiptSrc("data:text/html;base64,PHNjcmlwdD4="), "");
  assert.equal(normalizeReceiptSrc("javascript:alert(1)"), "");
  assert.equal(
    normalizeReceiptSrc("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="),
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
  );
  assert.equal(
    normalizeReceiptSrc("iVBORw0KGgoAAAANSUhEUg=="),
    "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUg==",
  );
});

test("openSafeUrlInNewTab enforces noopener,noreferrer and rejects javascript:", () => {
  const calls = [];
  const prevWindow = globalThis.window;
  globalThis.window = {
    open(url, target, features) {
      calls.push({ url, target, features });
      return null;
    },
  };
  try {
    assert.equal(openSafeUrlInNewTab("javascript:alert(1)"), false);
    assert.equal(openSafeUrlInNewTab("blob:https://app.villeto.com/abc"), true);
    assert.deepEqual(calls, [
      {
        url: "blob:https://app.villeto.com/abc",
        target: "_blank",
        features: "noopener,noreferrer",
      },
    ]);
  } finally {
    globalThis.window = prevWindow;
  }
});

test("Auth marker cookie builder sets SameSite=Lax and Secure on HTTPS", () => {
  assert.equal(
    buildAuthMarkerCookie(3_600_000, true),
    "villeto_auth=true; path=/; max-age=3600; SameSite=Lax; Secure",
  );
  assert.equal(
    buildAuthMarkerCookie(3_600_000, false),
    "villeto_auth=true; path=/; max-age=3600; SameSite=Lax",
  );
  assert.equal(
    buildClearAuthMarkerCookie(true),
    "villeto_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; Secure",
  );
});

test("File upload validators reject SVG, oversized files, and bad extensions", () => {
  assert.equal(
    validateRasterImageFile({ name: "logo.svg", type: "image/svg+xml", size: 100 }).valid,
    false,
  );
  assert.equal(
    validateRasterImageFile({ name: "avatar.png", type: "image/png", size: 1024 }).valid,
    true,
  );
  assert.equal(
    validateRasterImageFile({ name: "huge.jpg", type: "image/jpeg", size: 10 * 1024 * 1024 }, 5 * 1024 * 1024).valid,
    false,
  );
  assert.equal(
    validateSpreadsheetFile({ name: "payload.exe", type: "application/octet-stream", size: 500 }).valid,
    false,
  );
  assert.equal(
    validateSpreadsheetFile({ name: "employees.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 1024 }).valid,
    true,
  );

  const dangerousRow = JSON.parse('{"email":"a@b.com","__proto__":{"admin":true},"constructor":{"x":1}}');
  const clean = sanitizePlainObjectRow(dangerousRow);
  assert.equal(clean.email, "a@b.com");
  assert.equal(({}).admin, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(clean, "__proto__"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(clean, "constructor"), false);
});

test("escapeCSVValue neutralizes formula injection prefixes", () => {
  assert.equal(escapeCSVValue("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0");
  assert.equal(escapeCSVValue("+1+1"), "'+1+1");
  assert.equal(escapeCSVValue("-2+3"), "'-2+3");
  assert.equal(escapeCSVValue("@SUM(1+1)"), "'@SUM(1+1)");
  assert.equal(escapeCSVValue(" =1+1"), "' =1+1");
  assert.equal(escapeCSVValue("Acme, Inc."), '"Acme, Inc."');
  assert.equal(escapeCSVValue("Normal Vendor"), "Normal Vendor");
});

test("unflatten blocks prototype pollution via __proto__, constructor, and prototype", () => {
  const payload = JSON.parse(
    '{"__proto__.polluted":"yes","constructor.prototype.pwned":true,"items[0].name":"Line 1"}',
  );
  const res = unflatten(payload);
  assert.equal(({}).polluted, undefined);
  assert.equal(({}).pwned, undefined);
  assert.deepEqual(res.items, [{ name: "Line 1" }]);
});

test("passwordSchema enforces complexity including special character and length bounds", () => {
  assert.equal(passwordSchema.safeParse("Password1").success, false);
  assert.equal(passwordSchema.safeParse("Password1!").success, true);
  assert.equal(passwordSchema.safeParse("Ab1!" + "a".repeat(100)).success, false);
});

test("Security headers and production CSP harden browser protections", () => {
  const prodCsp = buildContentSecurityPolicy({ isProd: true });
  assert.equal(prodCsp.includes("'unsafe-eval'"), false);
  assert.equal(prodCsp.includes("object-src 'none'"), true);
  assert.equal(prodCsp.includes("frame-ancestors 'none'"), true);
  assert.equal(prodCsp.includes("base-uri 'self'"), true);
  assert.equal(prodCsp.includes("form-action 'self'"), true);

  const authHeaders = getSecurityHeaders({ isProd: true, isPublicPath: false });
  assert.equal(authHeaders["Cache-Control"], "no-store, private");
  assert.equal(authHeaders["X-Frame-Options"], "DENY");
  assert.equal(authHeaders["X-Content-Type-Options"], "nosniff");
  assert.ok(authHeaders["Permissions-Policy"]);
});
