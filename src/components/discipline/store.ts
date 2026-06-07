import { useCallback, useEffect, useState } from "react";

export interface AppBlock {
  id: string;
  name: string;
  kind: "app" | "site";
  startedAt: number;
  durationDays: number; // can be fractional for hours
}

export interface Bet {
  id: string;
  title: string;
  amount: number;
  startedAt: number;
  durationDays: number;
  risk: "Faible" | "Moyen" | "Élevé";
}

export interface Program {
  id: string;
  title: string;
  category: "Réunion" | "Sport" | "Travail" | "Études";
  at: number; // timestamp
  reminders: number[]; // minutes before
}

export interface DisciplineData {
  blocks: AppBlock[];
  bets: Bet[];
  programs: Program[];
}

const KEY = "filax-discipline-v1";

const SEED: DisciplineData = {
  blocks: [
    { id: "b1", name: "TikTok", kind: "app", startedAt: Date.now() - 1000 * 60 * 60 * 3, durationDays: 30 },
    { id: "b2", name: "Instagram", kind: "app", startedAt: Date.now() - 1000 * 60 * 60 * 12, durationDays: 7 },
  ],
  bets: [
    {
      id: "p1",
      title: "Pas de réseaux sociaux 30 jours",
      amount: 20,
      startedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
      durationDays: 30,
      risk: "Moyen",
    },
  ],
  programs: [
    {
      id: "pr1",
      title: "Séance de sport",
      category: "Sport",
      at: Date.now() + 1000 * 60 * 60 * 5,
      reminders: [30, 10],
    },
  ],
};

function load(): DisciplineData {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED;
    return { ...SEED, ...JSON.parse(raw) };
  } catch {
    return SEED;
  }
}

export function useDisciplineStore() {
  const [data, setData] = useState<DisciplineData>(SEED);

  useEffect(() => {
    setData(load());
  }, []);

  const persist = useCallback((next: DisciplineData) => {
    setData(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const addBlock = useCallback(
    (b: Omit<AppBlock, "id" | "startedAt">) =>
      setData((d) => {
        const next = { ...d, blocks: [{ ...b, id: crypto.randomUUID(), startedAt: Date.now() }, ...d.blocks] };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }),
    [],
  );

  const updateBlock = useCallback(
    (id: string, patch: Partial<AppBlock>) =>
      setData((d) => {
        const next = { ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }),
    [],
  );

  const removeBlock = useCallback(
    (id: string) =>
      setData((d) => {
        const next = { ...d, blocks: d.blocks.filter((b) => b.id !== id) };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }),
    [],
  );

  const addBet = useCallback(
    (b: Omit<Bet, "id" | "startedAt">) =>
      setData((d) => {
        const next = { ...d, bets: [{ ...b, id: crypto.randomUUID(), startedAt: Date.now() }, ...d.bets] };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }),
    [],
  );

  const updateBet = useCallback(
    (id: string, patch: Partial<Bet>) =>
      setData((d) => {
        const next = { ...d, bets: d.bets.map((b) => (b.id === id ? { ...b, ...patch } : b)) };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }),
    [],
  );

  const addProgram = useCallback(
    (p: Omit<Program, "id">) =>
      setData((d) => {
        const next = { ...d, programs: [{ ...p, id: crypto.randomUUID() }, ...d.programs].sort((a, b) => a.at - b.at) };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }),
    [],
  );

  const removeProgram = useCallback(
    (id: string) =>
      setData((d) => {
        const next = { ...d, programs: d.programs.filter((p) => p.id !== id) };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }),
    [],
  );

  return {
    data,
    persist,
    addBlock,
    updateBlock,
    removeBlock,
    addBet,
    updateBet,
    addProgram,
    removeProgram,
  } as const;
}

/** Returns ms remaining for a timed entity, clamped at 0. */
export function remainingMs(startedAt: number, durationDays: number): number {
  const end = startedAt + durationDays * 24 * 60 * 60 * 1000;
  return Math.max(0, end - Date.now());
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}j ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const DURATION_PRESETS = [
  { label: "1 heure", days: 1 / 24 },
  { label: "12 heures", days: 0.5 },
  { label: "24 heures", days: 1 },
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "3 mois", days: 90 },
  { label: "6 mois", days: 180 },
  { label: "12 mois", days: 365 },
];
