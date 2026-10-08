import assert from "node:assert/strict";
import { test } from "node:test";
import { saveMailboxAttachment } from "./mailbox-attachment-download.ts";

test("saves a PDF with its original name and identical binary bytes when API metadata falls back", async (t) => {
  const original = Uint8Array.from([37, 80, 68, 70, 45, 49, 46, 53, 10, 0, 255, 128, 13]);
  const response = new Blob([original], { type: "application/octet-stream" });
  let saved;
  let cleanup;
  let clicked = false;
  const link = { href: "", download: "", click() { clicked = true; }, remove() {} };
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => link,
    body: { appendChild: () => {} },
  };
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  t.mock.method(URL, "createObjectURL", (blob) => {
    saved = blob;
    return "blob:test-pdf";
  });
  const revoke = t.mock.method(URL, "revokeObjectURL", () => {});
  t.mock.method(globalThis, "setTimeout", (callback) => { cleanup = callback; });

  saveMailboxAttachment(response, { filename: "Supplier invoice.pdf", mimeType: "application/pdf" });

  assert.equal(clicked, true);
  assert.equal(link.download, "Supplier invoice.pdf");
  assert.equal(link.href, "blob:test-pdf");
  assert.equal(saved.type, "application/pdf");
  assert.deepEqual(new Uint8Array(await saved.arrayBuffer()), original);
  assert.equal(revoke.mock.callCount(), 0);
  cleanup();
  assert.equal(revoke.mock.callCount(), 1);
});
