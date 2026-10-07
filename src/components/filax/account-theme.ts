import { ACCOUNT_VISUALS } from "./account-visuals";
import type { Account } from "@/lib/filax-store";

/**
 * Mini-illustration thématique affichée dans la bulle d'un compte : un visuel
 * professionnel en lien direct avec le thème du compte (alliance pour Mariage,
 * mallette pour Business…). Retourne null quand aucun thème ne correspond —
 * l'appelant garde alors le pictogramme par défaut.
 */
export function themeImageFor(account: Pick<Account, "name" | "currency" | "lockedUntil" | "visualKey">): string {
  const selected = ACCOUNT_VISUALS.find((v) => v.key === account.visualKey);
  if (selected) return selected.src;
  const n = account.name.toLowerCase();
  const key = /mariage|wedding/.test(n) ? "wedding" : /famil/.test(n) ? "family" : /business|entreprise/.test(n) ? "business" : /voyage/.test(n) ? "airplane" : /étud|etud/.test(n) ? "studies" : /moto/.test(n) ? "motorcycle" : /terrain/.test(n) ? "land" : account.currency === "CDF" ? "bank-classic" : "bank-modern";
  return ACCOUNT_VISUALS.find((v) => v.key === key)?.src ?? ACCOUNT_VISUALS[0]?.src ?? "";
}
