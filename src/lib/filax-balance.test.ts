import { describe, expect, test } from "vitest";
import { accountDisplayBalance, pendingBalance, reservedBalance, spendableBalance, type Account } from "./filax-store";

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
  test("l'échéance passée libère toute la réserve sans attendre une sortie", () => {
    const unlocked = account({ availableBalance: 0, reservedBalance: 1_000, pendingOutgoing: 75, lockedUntil: Date.now() - 1 });
    expect(spendableBalance(unlocked)).toBe(925);
    expect(reservedBalance(unlocked)).toBe(0);
  });
  test("une réserve sans date de blocage n'est pas libérée par ce correctif", () => {
    const reserved = account({ availableBalance: 800, reservedBalance: 200 });
    expect(spendableBalance(reserved)).toBe(800);
    expect(reservedBalance(reserved)).toBe(200);
  });
  test("les entrées et sorties en attente sont totalisées sans changer le disponible", () => {
    const value = account({ availableBalance: 900, pendingIncoming: 100, pendingOutgoing: 50 });
    expect(pendingBalance(value)).toBe(150);
    expect(spendableBalance(value)).toBe(850);
  });
  test("la carte affiche le montant total même quand le compte est verrouillé", () => {
    const locked = account({ balance: 4_200, availableBalance: 0, reservedBalance: 4_200, lockedUntil: Date.now() + 86_400_000 });
    expect(accountDisplayBalance(locked)).toBe(4_200);
    expect(spendableBalance(locked)).toBe(0);
  });
});
