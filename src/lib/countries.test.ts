import { describe, expect, it } from "vitest";
import { COUNTRY_CODES, COUNTRY_GROUPS, callingCode } from "./countries";

describe("FILAX initial country coverage", () => {
  it("contains exactly 50 unique supported countries", () => {
    expect(COUNTRY_CODES).toHaveLength(50);
    expect(new Set(COUNTRY_CODES).size).toBe(50);
  });

  it.each([
    ["Afrique", 20],
    ["Amérique", 10],
    ["Asie", 10],
    ["Europe", 10],
  ])("allocates the requested count to %s", (label, count) => {
    expect(COUNTRY_GROUPS.find((group) => group.label === label)?.codes).toHaveLength(count);
  });

  it("keeps the priority markets explicitly requested", () => {
    for (const code of ["CD", "US", "CA", "CN", "FR", "BE", "GB"]) {
      expect(COUNTRY_CODES).toContain(code);
    }
  });

  it("provides a real international calling code for every choice", () => {
    for (const code of COUNTRY_CODES) expect(callingCode(code)).toMatch(/^\+\d+$/);
  });
});
