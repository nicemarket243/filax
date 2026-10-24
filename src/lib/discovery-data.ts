import type { Account } from "./filax-store";

/** Independent examples; never copied from persisted personal accounts. */
export const DISCOVERY_ACCOUNTS: Account[] = [
  { id: "discovery-usd", name: "Exemple USD", currency: "USD", icon: "💼", color: "brand-blue", balance: 500, kind: "main" },
  { id: "discovery-cdf", name: "Exemple CDF", currency: "CDF", icon: "💼", color: "brand-teal", balance: 0, kind: "main" },
];