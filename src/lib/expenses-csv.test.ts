import { describe, expect, test } from "vitest";
import { expensesToCsv } from "./expenses";

const base = { vendor: "V", expense_date: "2026-11-01", currency: "USD", category: "Autre", doc_type: "reçu", description: null as string | null };
const line = (r: Partial<typeof base> & { amount: number }) => expensesToCsv([{ ...base, ...r }]).split("\n")[1];
const amountCell = (amount: number) => line({ amount }).split(";")[4];

describe("expense CSV export regressions", () => {
  test("zero amount is 0,00", () => expect(amountCell(0)).toBe("0,00"));
  test("negative amount keeps its sign", () => expect(amountCell(-12.5)).toBe("-12,50"));
  test("large amount has no thousands separator or exponent", () => {
    expect(amountCell(1234567.891)).toBe("1234567,89");
    expect(amountCell(1e21)).not.toMatch(/e/i);
  });
  test("semicolon in text is quoted so columns don't shift", () => {
    const l = line({ amount: 1, vendor: "A;B", description: "x;y" });
    expect(l).toBe('2026-11-01;"A;B";Autre;reçu;1,00;USD;"x;y"');
  });
  test("quotation marks are doubled inside a quoted cell", () => {
    expect(line({ amount: 1, vendor: 'Le "Bon" Prix' })).toBe('2026-11-01;"Le ""Bon"" Prix";Autre;reçu;1,00;USD;');
  });
  test("each row keeps exactly 7 columns", () => {
    const csv = expensesToCsv([{ ...base, amount: 3, vendor: 'a;"b";c', description: "d;e" }]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const cells = csv.split("\n")[1].match(/("([^"]|"")*"|[^;]*)(;|$)/g)!.filter((c) => c !== "");
    expect(cells.length).toBe(7);
  });
});
