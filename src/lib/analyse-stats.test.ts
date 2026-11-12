import { describe, expect, test } from "vitest";
import { CDF_PER_USD, DAY, balanceSeries, periodStats } from "./analyse-stats";

const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
const tx = (daysAgo: number, type: "depot" | "retrait", amount: number, currency: "USD" | "CDF", status: "confirmed" | "pending" = "confirmed") =>
  ({ at: NOW - daysAgo * DAY, type, amount, currency, method: "carte" as const, status });

const data = [
  tx(1, "retrait", 75, "USD"),
  tx(3, "depot", 500, "USD"),
  tx(2, "depot", 250_000, "CDF"),
  tx(7, "depot", 100, "USD"),          // exactly on 7-day boundary: included
  tx(7.0001, "retrait", 999, "USD"),   // just outside 7 days
  tx(12, "retrait", 230, "USD"),
  tx(20, "retrait", 45_000, "CDF"),
  tx(30, "depot", 1000, "USD"),        // exactly on 30-day boundary: included
  tx(30.0001, "depot", 5000, "USD"),   // just outside 30 days
  tx(4, "depot", 10_000, "USD", "pending"), // pending never counted
];

describe("Analyse totals", () => {
  test("7 days includes the boundary day, excludes older and pending, converts CDF", () => {
    const s = periodStats(data, 7 * DAY, NOW);
    expect(s.list).toHaveLength(4);
    expect(s.inflow).toBeCloseTo(600 + 250_000 / CDF_PER_USD, 6);
    expect(s.outflow).toBe(75);
  });

  test("30 days includes the boundary day and CDF withdrawals", () => {
    const s = periodStats(data, 30 * DAY, NOW);
    expect(s.list).toHaveLength(8);
    expect(s.inflow).toBeCloseTo(1600 + 250_000 / CDF_PER_USD, 6);
    expect(s.outflow).toBeCloseTo(75 + 999 + 230 + 45_000 / CDF_PER_USD, 6);
  });

  test("future-dated operations are ignored", () => {
    expect(periodStats([tx(-1, "depot", 50, "USD")], 7 * DAY, NOW).list).toHaveLength(0);
  });
});

describe("Analyse curve", () => {
  test("starts at period start, ends today on the current total, chronological", () => {
    const s = periodStats(data, 7 * DAY, NOW);
    const pts = balanceSeries(s.list, 10_000, 7 * DAY, NOW);
    expect(pts[0]!.at).toBe(NOW - 7 * DAY);
    expect(pts[0]!.value).toBeCloseTo(10_000 - s.net, 6);
    expect(pts.at(-1)).toMatchObject({ at: NOW, value: 10_000 });
    expect(pts.at(-2)!.value).toBeCloseTo(10_000, 6);
    for (let i = 1; i < pts.length; i++) expect(pts[i]!.at).toBeGreaterThanOrEqual(pts[i - 1]!.at);
  });

  test("7-day and 30-day curves differ and each reflects its own period", () => {
    const p7 = balanceSeries(periodStats(data, 7 * DAY, NOW).list, 10_000, 7 * DAY, NOW);
    const p30 = balanceSeries(periodStats(data, 30 * DAY, NOW).list, 10_000, 30 * DAY, NOW);
    expect(p7).toHaveLength(6);
    expect(p30).toHaveLength(10);
    expect(p30[0]!.at).toBe(NOW - 30 * DAY);
    expect(p30[0]!.value).not.toBeCloseTo(p7[0]!.value, 2);
  });

  test("empty period gives a flat line at the current balance", () => {
    const pts = balanceSeries(periodStats([tx(40, "depot", 5, "USD")], 7 * DAY, NOW).list, 321, 7 * DAY, NOW);
    expect(pts.map((p) => p.value)).toEqual([321, 321]);
  });
});
