import { describe, expect, test } from "vitest";
import { pendingBalance, reservedBalance, spendableBalance, type Account } from "./filax-store";

const account = (extra: Partial<Account>): Account => ({ id: "test", name: "Test", currency: "USD", icon: "wallet", color: "brand-blue", balance: 1_000, ...extra });

describe("Compartiments de solde", () => {
  test("le disponible exclut les sorties en attente", () => {
    expect(spendableBalance(account({ availableBalance: 800, reservedBalance: 200, pendingOutgoing: 75 }))).toBe(725);
  });
  test("un compte verrouillé n'a aucun disponible avant échéance", () => {
    const locked = account({ availableBalance: 0, reservedBalance: 1_000, lockedUntil: Date.now() + 86_400_000 });
    expect(spendableBalance(locked)).toBe(0);
    expect(reservedBalance(locked)).toBe(1_000);
  });
  test("l'échéance passée rend le compartiment disponible", () => {
    expect(spendableBalance(account({ availableBalance: 1_000, reservedBalance: 0, lockedUntil: Date.now() - 1 }))).toBe(1_000);
  });
  test("les entrées et sorties en attente sont totalisées sans changer le disponible", () => {
    const value = account({ availableBalance: 900, pendingIncoming: 100, pendingOutgoing: 50 });
    expect(pendingBalance(value)).toBe(150);
    expect(spendableBalance(value)).toBe(850);
  });
});
