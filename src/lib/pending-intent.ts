/**
 * Bus d'intentions inter-modules FILAX.
 * L'Orchestrateur (page d'accueil) dépose une intention à exécuter, puis navigue
 * vers le module cible. La page cible la récupère au montage et l'exécute.
 */

export interface PendingIntent {
  module: "discipline" | "economie" | "assurance";
  action: string;
  params: Record<string, string | number | boolean | null>;
  reply?: string;
  at: number;
}

const KEY = "filax-pending-intent";
const MAX_AGE_MS = 60_000;

export function setPendingIntent(intent: Omit<PendingIntent, "at">): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...intent, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/** Récupère ET consomme l'intention si elle vise le module donné. */
export function takePendingIntent(module: PendingIntent["module"]): PendingIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingIntent;
    if (parsed.module !== module) return null;
    localStorage.removeItem(KEY);
    if (Date.now() - parsed.at > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}
