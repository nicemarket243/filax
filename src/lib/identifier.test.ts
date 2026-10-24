import { describe, expect, test } from "vitest";
import { detectIdentifier, normalizePhone } from "./identifier";

describe("Login identifier detection", () => {
  test("an email address is detected as email", () => {
    expect(detectIdentifier("alvine@example.com")).toBe("email");
    expect(detectIdentifier("  a.b@cd.co  ")).toBe("email");
  });
  test("a FILAX ID is detected as filax", () => {
    expect(detectIdentifier("FLX-8241-KB")).toBe("filax");
    expect(detectIdentifier("flx-12756340")).toBe("filax");
  });
  test("a phone number is detected as phone", () => {
    expect(detectIdentifier("+243814900710")).toBe("phone");
    expect(detectIdentifier("0814 900 710")).toBe("phone");
  });
  test("empty or ambiguous input is rejected", () => {
    expect(detectIdentifier("")).toBeNull();
    expect(detectIdentifier("   ")).toBeNull();
    expect(detectIdentifier("123")).toBeNull();
    expect(detectIdentifier("bonjour")).toBeNull();
  });
  test("phone normalization adds the international prefix", () => {
    expect(normalizePhone("+243 814 900 710")).toBe("+243814900710");
    expect(normalizePhone("0814")).toBeNull();
  });
});
