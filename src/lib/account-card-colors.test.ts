import { describe, expect, test } from "vitest";
import type { Account } from "@/lib/filax-store";
import {
  ACCOUNT_CARD_COLOR_TOKENS,
  accountCardColors,
  accountCardTheme,
  isMainAccount,
} from "./account-card-colors";

const account = (id: string, name: string, extra: Partial<Account> = {}): Account => ({
  id,
  name,
  currency: "USD",
  icon: "wallet",
  color: "brand-blue",
  balance: 100,
  kind: "savings",
  ...extra,
});

describe("Couleurs automatiques des cartes", () => {
  test("la palette interne contient exactement 30 teintes distinctes", () => {
    expect(ACCOUNT_CARD_COLOR_TOKENS).toHaveLength(30);
    expect(new Set(ACCOUNT_CARD_COLOR_TOKENS).size).toBe(30);
  });

  test("les comptes principaux USD et CDF gardent le bleu et le vert FILAX", () => {
    const usd = account("main-usd", "Compte Principal USD", { kind: "main" });
    const cdf = account("main-cdf", "Compte Principal CDF", { kind: "main", currency: "CDF", color: "brand-teal" });
    const colors = accountCardColors([usd, cdf]);
    expect(colors.get(usd.id)).toBe("var(--brand-blue)");
    expect(colors.get(cdf.id)).toBe("var(--brand-green)");
  });

  test("les noms et visuels famille, mariage et investissement sont reconnus", () => {
    expect(accountCardTheme(account("a", "Cotisation Famille"))).toBe("family");
    expect(accountCardTheme(account("b", "Noces de Willem", { visualKey: "wedding" }))).toBe("wedding");
    expect(accountCardTheme(account("c", "Investissement 2027"))).toBe("investment");
  });

  test("chaque carte reçoit une couleur différente, même pour deux mariages", () => {
    const accounts = [
      account("main-usd", "Compte Principal USD", { kind: "main" }),
      account("main-cdf", "Compte Principal CDF", { kind: "main", currency: "CDF" }),
      account("family", "Compte Famille"),
      account("business", "Compte Business"),
      account("wedding-a", "Compte Mariage"),
      account("wedding-b", "Mariage Willem et Angela"),
    ];
    const colors = accountCardColors(accounts);
    expect(new Set(accounts.map((item) => colors.get(item.id))).size).toBe(accounts.length);
  });

  test("l'attribution reste identique quand l'ordre du carrousel change", () => {
    const accounts = [
      account("b", "Famille"),
      account("a", "Mariage"),
      account("c", "Investissement"),
    ];
    const forward = accountCardColors(accounts);
    const reversed = accountCardColors([...accounts].reverse());
    for (const item of accounts) expect(reversed.get(item.id)).toBe(forward.get(item.id));
  });

  test("huit sous-comptes sans thème connu reçoivent tous une teinte distincte", () => {
    const accounts = Array.from({ length: 8 }, (_, index) => account(`generic-${index}`, `Projet ${index}`));
    const colors = accountCardColors(accounts);
    expect(new Set(accounts.map((item) => colors.get(item.id))).size).toBe(8);
  });

  test("les anciens comptes principaux sans indicateur technique restent reconnus", () => {
    expect(isMainAccount(account("legacy", "Compte Principal USD", { kind: undefined }))).toBe(true);
    expect(isMainAccount(account("sub", "Compte Mariage", { kind: undefined }))).toBe(false);
  });
});
