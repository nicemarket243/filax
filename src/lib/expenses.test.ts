import { describe, expect, test } from "vitest";
import { expensesToCsv, totalsByCurrency } from "./expenses";

const rows = [
  { vendor: 'Shop "A"; RDC', expense_date: "2026-11-01", amount: 12.5, currency: "USD", category: "Alimentation", doc_type: "reçu", description: null },
  { vendor: "B", expense_date: null, amount: 7.25, currency: "USD", category: "Transport", doc_type: "facture", description: "Taxi" },
  { vendor: "C", expense_date: null, amount: 5000, currency: "CDF", category: "Autre", doc_type: "reçu", description: "" },
];

describe("expenses export", () => {
  test("totals are kept per currency, never mixed", () => {
    expect(totalsByCurrency(rows)).toEqual({ USD: 19.75, CDF: 5000 });
  });
  test("CSV escapes separators and quotes", () => {
    const csv = expensesToCsv(rows);
    expect(csv.split("\n")[1]).toBe('2026-11-01;"Shop ""A""; RDC";Alimentation;reçu;12.50;USD;');
  });
});
