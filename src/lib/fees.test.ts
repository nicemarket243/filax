import { describe, it, expect } from "vitest";
import { checkOutflow, computeFee, pickRule } from "./fees";

describe("règles d'argent", () => {
  it("995 $ + 4 $ de frais sur 1 000 $ est accepté, reste 1 $", () => {
    expect(checkOutflow(1000, 995, 4)).toEqual({ ok: true, total: 999, remaining: 1 });
  });
  it("1 000 $ + 4 $ de frais sur 1 000 $ est refusé", () => {
    expect(checkOutflow(1000, 1000, 4).ok).toBe(false);
  });
  it("retrait refusé avant la date de déblocage", () => {
    expect(checkOutflow(1000, 10, 0, "2027-12-15", new Date("2026-11-12")).ok).toBe(false);
  });
  it("frais par défaut 0,5 % avec minimum 0,10", () => {
    const r = { operation: "*", fixed: 0, percent: 0.5, min_fee: 0.1 };
    expect(computeFee(r, 10)).toBe(0.1);
    expect(computeFee(r, 1000)).toBe(5);
  });
  it("une règle spécifique à la devise l'emporte", () => {
    const rules = [{ operation: "*", fixed: 0, percent: 0.5, min_fee: 0.1 }, { operation: "withdraw", currency: "CDF", fixed: 500, percent: 0, min_fee: 0 }];
    expect(pickRule(rules, { operation: "withdraw", currency: "CDF" })?.fixed).toBe(500);
    expect(pickRule(rules, { operation: "withdraw", currency: "USD" })?.percent).toBe(0.5);
  });
});
