import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { canReviewOutflow, canValidateDeposit, transactionFee } from "./transaction-review";

describe("Transaction review guards", () => {
  test("deposit needs phone and amount, not a PIN", () => {
    assert.equal(canValidateDeposit(10, "+243814000000", 1), true);
    assert.equal(canValidateDeposit(10, "", 1), false);
    assert.equal(canValidateDeposit(0, "+243814000000", 1), false);
  });
  test("outflow requires exactly four PIN digits", () => {
    assert.equal(canReviewOutflow(10, 100, "1234", "FLX-TEST"), true);
    for (const pin of ["", "123", "123456", "abcd"]) assert.equal(canReviewOutflow(10, 100, pin, "FLX-TEST"), false);
  });
  test("unresolved recipient cannot reach confirmation", () => {
    assert.equal(canReviewOutflow(10, 100, "1234", ""), false);
  });
  test("insufficient balance includes fees", () => {
    assert.equal(canReviewOutflow(100, 100, "1234", "FLX-TEST"), false);
    assert.equal(transactionFee(100), 0.5);
    assert.equal(transactionFee(10), 0.1);
  });
});