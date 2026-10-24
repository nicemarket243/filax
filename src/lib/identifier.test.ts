import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { detectIdentifier, normalizePhone } from "./identifier";

describe("Login identifier detection", () => {
  test("an email address is detected as email", () => {
    assert.equal(detectIdentifier("alvine@example.com"), "email");
    assert.equal(detectIdentifier("  a.b@cd.co  "), "email");
  });
  test("a FILAX ID is detected as filax", () => {
    assert.equal(detectIdentifier("FLX-8241-KB"), "filax");
    assert.equal(detectIdentifier("flx-12756340"), "filax");
  });
  test("a phone number is detected as phone", () => {
    assert.equal(detectIdentifier("+243814900710"), "phone");
    assert.equal(detectIdentifier("0814 900 710"), "phone");
  });
  test("empty or ambiguous input is rejected", () => {
    assert.equal(detectIdentifier(""), null);
    assert.equal(detectIdentifier("   "), null);
    assert.equal(detectIdentifier("123"), null);
    assert.equal(detectIdentifier("bonjour"), null);
  });
  test("phone normalization adds the international prefix", () => {
    assert.equal(normalizePhone("+243 814 900 710"), "+243814900710");
    assert.equal(normalizePhone("0814"), null);
  });
});
