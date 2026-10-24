import { test } from "vitest";
import { strict as assert } from "node:assert";
import { loadDocumentFile } from "./company-documents";

test("PDF sharing rejects failed downloads and HTML responses", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("denied", { status: 401 });
    await assert.rejects(loadDocumentFile("/document.pdf", "document.pdf"), /unavailable/);
    globalThis.fetch = async () => new Response("<html>login</html>");
    await assert.rejects(loadDocumentFile("/document.pdf", "document.pdf"), /Invalid PDF/);
    globalThis.fetch = async () => new Response("%PDF-1.4\nexample");
    const file = await loadDocumentFile("/document.pdf", "document.pdf");
    assert.equal(file.type, "application/pdf");
    assert.equal(file.name, "document.pdf");
    assert.equal(await file.text(), "%PDF-1.4\nexample");
  } finally {
    globalThis.fetch = original;
  }
});