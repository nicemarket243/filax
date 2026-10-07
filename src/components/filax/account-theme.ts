import mariageImg from "@/assets/account-themes/mariage.jpg";
import familleImg from "@/assets/account-themes/famille.jpg";
import businessImg from "@/assets/account-themes/business.jpg";
import usdImg from "@/assets/account-themes/principal-usd.jpg";
import cdfImg from "@/assets/account-themes/principal-cdf.jpg";
import epargneImg from "@/assets/account-themes/epargne.jpg";
import type { Account } from "@/lib/filax-store";

/**
 * Mini-illustration thématique affichée dans la bulle d'un compte : un visuel
 * professionnel en lien direct avec le thème du compte (alliance pour Mariage,
 * mallette pour Business…). Retourne null quand aucun thème ne correspond —
 * l'appelant garde alors le pictogramme par défaut.
 */
export function themeImageFor(account: Pick<Account, "name" | "currency" | "lockedUntil">): string | null {
  const n = account.name.toLowerCase();
  if (/mariage|wedding/.test(n)) return mariageImg;
  if (/famil/.test(n)) return familleImg;
  if (/business|entreprise/.test(n)) return businessImg;
  if (/épargne|epargne|saving/.test(n)) return epargneImg;
  if (/principal|courant|main/.test(n)) return account.currency === "CDF" ? cdfImg : usdImg;
  return null;
}
