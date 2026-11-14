import { describe, expect, it } from "vitest";
import { BANK_CONSENT_VERSION, bankOpeningSchema, isConfirmedBankAccount } from "./bank-opening";

const validInput = {
  bankCode: "EQUITY",
  currencies: ["USD", "CDF"] as const,
  clientKey: "5f18c74b-b9e7-45f2-9329-c0b6f435aa4f",
  consentVersion: BANK_CONSENT_VERSION,
  custodyAcknowledged: true,
  privacyAccepted: true,
  requestTermsAccepted: true,
};

describe("bank opening request", () => {
  it("accepts both main-account currencies with complete consent", () => {
    expect(bankOpeningSchema.parse(validInput).currencies).toEqual(["USD", "CDF"]);
  });

  it("rejects every missing consent", () => {
    for (const key of ["custodyAcknowledged", "privacyAccepted", "requestTermsAccepted"] as const) {
      expect(() => bankOpeningSchema.parse({ ...validInput, [key]: false })).toThrow();
    }
  });

  it("rejects empty and duplicate currency selections", () => {
    expect(() => bankOpeningSchema.parse({ ...validInput, currencies: [] })).toThrow();
    expect(() => bankOpeningSchema.parse({ ...validInput, currencies: ["USD", "USD"] })).toThrow();
  });

  it("requires an idempotency key and the current consent version", () => {
    expect(() => bankOpeningSchema.parse({ ...validInput, clientKey: "not-a-key" })).toThrow();
    expect(() => bankOpeningSchema.parse({ ...validInput, consentVersion: "old-version" })).toThrow();
  });

  it("never treats a recorded request as a confirmed bank account", () => {
    expect(isConfirmedBankAccount({ status: "submitted", integration_status: "not_connected", external_reference: null })).toBe(false);
    expect(isConfirmedBankAccount({ status: "approved", integration_status: "confirmed", external_reference: null })).toBe(false);
    expect(isConfirmedBankAccount({ status: "approved", integration_status: "confirmed", external_reference: "BANK-123" })).toBe(true);
  });
});
