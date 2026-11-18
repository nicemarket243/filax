import type { Account, Profile } from "./filax-store";
import type { Discovery } from "@/components/filax/public-welcome";

/** Espace vierge d'un nouveau visiteur : aucun solde ni historique repris d'un compte existant. */
export const DISCOVERY_ACCOUNTS: Account[] = [
  { id: "discovery-usd", name: "Compte Principal USD", currency: "USD", icon: "💼", color: "brand-blue", balance: 0, availableBalance: 0, reservedBalance: 0, pendingIncoming: 0, pendingOutgoing: 0, kind: "main" },
  { id: "discovery-cdf", name: "Compte Principal CDF", currency: "CDF", icon: "💼", color: "brand-green", balance: 0, availableBalance: 0, reservedBalance: 0, pendingIncoming: 0, pendingOutgoing: 0, kind: "main" },
];

export function discoveryProfile(discovery: Discovery | null): Profile {
  if (!discovery) return { firstName: "", lastName: "", phone: "", country: "CD", filaxId: "", photo: null, verified: false };
  const [first, ...rest] = discovery.name.trim().split(/\s+/);
  return {
    firstName: discovery.prenom ?? rest.join(" ") ?? "",
    lastName: discovery.nom ?? first ?? "",
    phone: discovery.phone ?? "",
    email: discovery.email,
    country: discovery.country ?? "CD",
    filaxId: discovery.filaxId ?? "",
    photo: discovery.photo ?? null,
    verified: false,
  };
}
