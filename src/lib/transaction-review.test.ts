import { describe, expect, test } from "vitest";
import { canReviewOutflow, canValidateDeposit, transactionFee } from "./transaction-review";

describe("Transaction review guards", () => {
  test("deposit needs phone and amount, not a PIN", () => {
    expect(canValidateDeposit(10, "+243814000000", 1)).toBe(true);
    expect(canValidateDeposit(10, "", 1)).toBe(false);
    expect(canValidateDeposit(0, "+243814000000", 1)).toBe(false);
  });
  test("outflow requires exactly four PIN digits", () => {
    expect(canReviewOutflow(10, 100, "1234", "FLX-TEST")).toBe(true);
    for (const pin of ["", "123", "123456", "abcd"]) expect(canReviewOutflow(10, 100, pin, "FLX-TEST")).toBe(false);
  });
  test("unresolved recipient cannot reach confirmation", () => {
    expect(canReviewOutflow(10, 100, "1234", "")).toBe(false);
  });
  test("insufficient balance includes fees", () => {
    expect(canReviewOutflow(100, 100, "1234", "FLX-TEST")).toBe(false);
    expect(transactionFee(100)).toBe(0.5);
    expect(transactionFee(10)).toBe(0.1);
  });
});
