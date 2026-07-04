import { useCallback, useEffect, useState } from "react";

export interface AppBlock {
  id: string;
  name: string;
  kind: "app" | "site";
  startedAt: number;
  durationDays: number; // can be fractional for hours
}

export type DuelStatus = "en_cours" | "gagne" | "perdu";

/** "Duel de Productivité" — deux personnes s'affrontent sur un objectif commun. */
export interface Duel {
  id: string;
  title: string;
  opponent: string;
  stake: number; // enjeu bloqué par participant ($)
  startedAt: number;
  durationDays: number;
  myProgress: number; // 0-100
  oppProgress: number; // 0-100
  status: DuelStatus;
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
  duels: Duel[];
  programs: Program[];
}

const KEY = "filax-discipline-v2";

const SEED: DisciplineData = {
  blocks: [
    { id: "b1", name: "TikTok", kind: "app", startedAt: Date.now() - 1000 * 60 * 60 * 3, durationDays: 30 },
    { id: "b2", name: "Instagram", kind: "app", startedAt: Date.now() - 1000 * 60 * 60 * 12, durationDays: 7 },
  ],
  duels: [
    {
      id: "d1",
      title: "Lancer mon business en 3 jours",
      opponent: "Karim",
      stake: 50,
      startedAt: Date.now() - 1000 * 60 * 60 * 20,
      durationDays: 3,
      myProgress: 65,
      oppProgress: 40,
      status: "en_cours",
    },
    {
      id: "d2",
      title: "10 séances de sport en 2 semaines",
      opponent: "Sarah",
      stake: 30,
      startedAt: Date.now() - 1000 * 60 * 60 * 24 * 16,
      durationDays: 14,
      myProgress: 100,
      oppProgress: 80,
      status: "gagne",
    },
  ],
  programs: [
    {
      id: "pr1",
      title: "Séance de sport",
      category: "Sport",
      at: Date.now() + 1000 * 60 * 60 * 5,
      reminders: [360, 180, 60, 0],
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

  const addDuel = useCallback(
    (b: Omit<Duel, "id" | "startedAt" | "myProgress" | "oppProgress" | "status">) =>
      setData((d) => {
        const next = {
          ...d,
          duels: [
            {
              ...b,
              id: crypto.randomUUID(),
              startedAt: Date.now(),
              myProgress: 0,
              oppProgress: 0,
              status: "en_cours" as DuelStatus,
            },
            ...d.duels,
          ],
        };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }),
    [],
  );

  const updateDuel = useCallback(
    (id: string, patch: Partial<Duel>) =>
      setData((d) => {
        const next = { ...d, duels: d.duels.map((b) => (b.id === id ? { ...b, ...patch } : b)) };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }),
    [],
  );

  const removeDuel = useCallback(
    (id: string) =>
      setData((d) => {
        const next = { ...d, duels: d.duels.filter((b) => b.id !== id) };
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
    addDuel,
    updateDuel,
    removeDuel,
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

/** Score de fiabilité : basé sur le ratio de duels gagnés (0-100). */
export function reliabilityScore(duels: Duel[]): number {
  const finished = duels.filter((d) => d.status !== "en_cours");
  if (finished.length === 0) return 0;
  const wins = finished.filter((d) => d.status === "gagne").length;
  return Math.round((wins / finished.length) * 100);
}

/** Pot commun : 5% de chaque enjeu de duel reversé au pot global mensuel. */
export function commonPot(duels: Duel[]): number {
  return Math.round(duels.reduce((s, d) => s + d.stake * 0.05, 0));
}

export const DURATION_PRESETS = [
  { label: "24 heures", days: 1 },
  { label: "3 jours", days: 3 },
  { label: "7 jours", days: 7 },
  { label: "14 jours", days: 14 },
  { label: "30 jours", days: 30 },
];
