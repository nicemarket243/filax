import type { Account } from "@/lib/filax-store";

/**
 * Palette interne : les teintes sont des jetons CSS, jamais un choix exposé à
 * l'utilisateur. Les deux comptes principaux conservent les couleurs FILAX.
 */
export const ACCOUNT_CARD_COLOR_TOKENS = [
  "garnet",
  "burgundy",
  "raspberry",
  "plum",
  "aubergine",
  "violet",
  "amethyst",
  "orchid",
  "mauve",
  "terracotta",
  "copper",
  "bronze",
  "amber",
  "honey",
  "olive",
  "moss",
  "forest",
  "emerald",
  "jade",
  "sage",
  "teal",
  "lagoon",
  "cyan",
  "petrol",
  "charcoal",
  "graphite",
  "cocoa",
  "coffee",
  "rosewood",
  "mahogany",
] as const;

export type AccountCardColorToken = (typeof ACCOUNT_CARD_COLOR_TOKENS)[number];
export type AccountCardTheme =
  | "wedding"
  | "family"
  | "investment"
  | "business"
  | "travel"
  | "education"
  | "property"
  | "vehicle"
  | "health"
  | "agriculture"
  | "technology"
  | "retirement"
  | "event"
  | "shop"
  | "general";

const THEME_COLORS: Record<Exclude<AccountCardTheme, "general">, readonly AccountCardColorToken[]> = {
  wedding: ["raspberry", "burgundy", "plum", "rosewood"],
  family: ["forest", "moss", "jade", "olive"],
  investment: ["emerald", "bronze", "jade", "amber"],
  business: ["bronze", "copper", "amber", "coffee"],
  travel: ["lagoon", "teal", "petrol", "cyan"],
  education: ["violet", "amethyst", "orchid", "aubergine"],
  property: ["copper", "terracotta", "cocoa", "bronze"],
  vehicle: ["graphite", "charcoal", "coffee", "garnet"],
  health: ["jade", "teal", "sage", "emerald"],
  agriculture: ["olive", "moss", "forest", "sage"],
  technology: ["amethyst", "violet", "petrol", "orchid"],
  retirement: ["plum", "mauve", "aubergine", "cocoa"],
  event: ["garnet", "raspberry", "mahogany", "burgundy"],
  shop: ["amber", "honey", "bronze", "copper"],
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function isMainAccount(account: Pick<Account, "kind" | "name" | "parentAccountId">) {
  return account.kind === "main" || (!account.parentAccountId && /principal|courant/.test(normalize(account.name)));
}

export function accountCardTheme(account: Pick<Account, "name" | "visualKey" | "icon">): AccountCardTheme {
  const text = normalize(`${account.name} ${account.visualKey ?? ""} ${account.icon ?? ""}`);
  const matches = (pattern: RegExp) => pattern.test(text);

  if (matches(/mariage|wedding|fianc|nupt/)) return "wedding";
  if (matches(/famille|family|parents?|enfants?/)) return "family";
  if (matches(/invest|placement|epargne croissance|capital/)) return "investment";
  if (matches(/business|entreprise|societe|startup|office/)) return "business";
  if (matches(/voyage|travel|vacances|beach|airplane|boat|tourisme/)) return "travel";
  if (matches(/etude|universit|school|education|scolar|etudiant/)) return "education";
  if (matches(/maison|home|immobil|terrain|apartment|land|construction|loyer/)) return "property";
  if (matches(/voiture|vehicle|car|moto|motorcycle/)) return "vehicle";
  if (matches(/sante|health|medical|clinique/)) return "health";
  if (matches(/agric|farm|champ|elevage|solar/)) return "agriculture";
  if (matches(/technolog|digital|informatique|technology/)) return "technology";
  if (matches(/retraite|retirement|pension/)) return "retirement";
  if (matches(/evenement|event|fete|ceremonie|anniversaire/)) return "event";
  if (matches(/commerce|shop|boutique|magasin/)) return "shop";
  return "general";
}

function hash(value: string) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function firstUnused(
  candidates: readonly AccountCardColorToken[],
  seed: number,
  used: ReadonlySet<AccountCardColorToken>,
) {
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(seed + offset) % candidates.length];
    if (!used.has(candidate)) return candidate;
  }
  return null;
}

/** Attribue une couleur distincte à chaque carte, de façon stable et sans persistance. */
export function accountCardColors(accounts: readonly Account[]): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  const used = new Set<AccountCardColorToken>();
  const subaccounts: Account[] = [];

  for (const account of accounts) {
    if (!isMainAccount(account)) {
      subaccounts.push(account);
      continue;
    }
    result.set(account.id, account.currency === "USD" ? "var(--brand-blue)" : "var(--brand-green)");
  }

  // L'ordre de tri rend l'attribution indépendante de l'ordre d'affichage.
  subaccounts.sort((a, b) => a.id.localeCompare(b.id));
  for (const account of subaccounts) {
    const theme = accountCardTheme(account);
    const preferred = theme === "general" ? [] : THEME_COLORS[theme];
    const seed = hash(account.id);
    const selected = firstUnused(preferred, seed, used) ?? firstUnused(ACCOUNT_CARD_COLOR_TOKENS, seed, used);
    // FILAX limite les comptes à dix : la palette de trente teintes suffit toujours.
    if (!selected) continue;
    used.add(selected);
    result.set(account.id, `var(--account-card-${selected})`);
  }

  return result;
}
