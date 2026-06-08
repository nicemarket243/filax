import { useCallback, useEffect, useState } from "react";

export type Currency = "USD" | "CDF";
export type AccountKind = "principal" | "secondaire" | "verrouille";

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  kind: AccountKind;
  icon: string; // emoji
  color: string; // brand token name e.g. "brand-green"
  balance: number;
  lockedUntil?: number | null; // timestamp ms
}

export type TxType = "depot" | "retrait";
export type TxMethod = "mobile" | "carte" | "crypto" | "groupe";
export type TxStatus = "en_attente" | "confirme" | "effectue";

export interface Transaction {
  id: string;
  accountId: string;
  type: TxType;
  amount: number;
  currency: Currency;
  method: TxMethod;
  status: TxStatus;
  reference: string;
  at: number;
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: number; // timestamp
  icon: string;
  color: string;
  description?: string;
}

export interface GroupMember {
  id: string;
  name: string;
  paid: boolean;
  amount: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  target: number;
  icon: string;
  members: GroupMember[];
}

export interface EconomieData {
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  groups: Group[];
}

const KEY = "filax-economie-v1";

function ref(): string {
  return "FLX-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Date.now().toString(36).toUpperCase().slice(-4);
}

const now = Date.now();
const DAY = 86_400_000;

const SEED: EconomieData = {
  accounts: [
    { id: "acc-main", name: "Compte principal", currency: "USD", kind: "principal", icon: "💼", color: "brand-green", balance: 12450.75 },
    { id: "acc-moto", name: "Épargne Moto", currency: "USD", kind: "secondaire", icon: "🏍️", color: "brand-blue", balance: 1840 },
    { id: "acc-cdf", name: "Compte CDF", currency: "CDF", kind: "secondaire", icon: "🇨🇩", color: "brand-gold", balance: 2_350_000 },
    { id: "acc-lock", name: "Mariage", currency: "USD", kind: "verrouille", icon: "💍", color: "brand-violet", balance: 3200, lockedUntil: now + 92 * DAY },
  ],
  transactions: [
    { id: "t1", accountId: "acc-main", type: "depot", amount: 500, currency: "USD", method: "mobile", status: "effectue", reference: ref(), at: now - 2 * DAY },
    { id: "t2", accountId: "acc-moto", type: "depot", amount: 240, currency: "USD", method: "carte", status: "effectue", reference: ref(), at: now - 5 * DAY },
    { id: "t3", accountId: "acc-main", type: "retrait", amount: 120, currency: "USD", method: "mobile", status: "effectue", reference: ref(), at: now - 8 * DAY },
    { id: "t4", accountId: "acc-main", type: "depot", amount: 1000, currency: "USD", method: "crypto", status: "effectue", reference: ref(), at: now - 12 * DAY },
    { id: "t5", accountId: "acc-cdf", type: "depot", amount: 850000, currency: "CDF", method: "mobile", status: "effectue", reference: ref(), at: now - 15 * DAY },
  ],
  goals: [
    { id: "g1", name: "Moto", target: 3500, saved: 1840, deadline: now + 120 * DAY, icon: "🏍️", color: "brand-blue", description: "Acheter ma première moto." },
    { id: "g2", name: "Commerce", target: 5000, saved: 4200, deadline: now + 60 * DAY, icon: "🛒", color: "brand-green", description: "Lancer mon commerce." },
    { id: "g3", name: "Études", target: 2000, saved: 600, deadline: now + 200 * DAY, icon: "🎓", color: "brand-gold" },
  ],
  groups: [
    {
      id: "grp1",
      name: "Tontine Famille",
      description: "Épargne mensuelle familiale.",
      target: 5000,
      icon: "👨‍👩‍👧",
      members: [
        { id: "m1", name: "Vous", paid: true, amount: 100 },
        { id: "m2", name: "Grace", paid: true, amount: 100 },
        { id: "m3", name: "Jonas", paid: false, amount: 100 },
        { id: "m4", name: "Sarah", paid: true, amount: 100 },
      ],
    },
  ],
};

function load(): EconomieData {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED;
    return { ...SEED, ...JSON.parse(raw) };
  } catch {
    return SEED;
  }
}

export function useEconomieStore() {
  const [data, setData] = useState<EconomieData>(SEED);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(load());
    setReady(true);
  }, []);

  const save = useCallback((updater: (d: EconomieData) => EconomieData) => {
    setData((d) => {
      const next = updater(d);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const renameAccount = useCallback(
    (id: string, name: string) => save((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, name } : a)) })),
    [save],
  );

  const lockAccount = useCallback(
    (id: string, until: number) =>
      save((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, kind: "verrouille", lockedUntil: until } : a)) })),
    [save],
  );

  const deposit = useCallback(
    (accountId: string, amount: number, method: TxMethod) =>
      save((d) => {
        const acc = d.accounts.find((a) => a.id === accountId);
        const tx: Transaction = {
          id: crypto.randomUUID(),
          accountId,
          type: "depot",
          amount,
          currency: acc?.currency ?? "USD",
          method,
          status: "effectue",
          reference: ref(),
          at: Date.now(),
        };
        return {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: a.balance + amount } : a)),
          transactions: [tx, ...d.transactions],
        };
      }),
    [save],
  );

  const withdraw = useCallback(
    (accountId: string, amount: number, method: TxMethod) =>
      save((d) => {
        const acc = d.accounts.find((a) => a.id === accountId);
        const tx: Transaction = {
          id: crypto.randomUUID(),
          accountId,
          type: "retrait",
          amount,
          currency: acc?.currency ?? "USD",
          method,
          status: "effectue",
          reference: ref(),
          at: Date.now(),
        };
        return {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: Math.max(0, a.balance - amount) } : a)),
          transactions: [tx, ...d.transactions],
        };
      }),
    [save],
  );

  const addGoal = useCallback(
    (g: Omit<Goal, "id">) => save((d) => ({ ...d, goals: [{ ...g, id: crypto.randomUUID() }, ...d.goals] })),
    [save],
  );

  const fundGoal = useCallback(
    (id: string, amount: number) =>
      save((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, saved: g.saved + amount } : g)) })),
    [save],
  );

  const addGroup = useCallback(
    (g: Omit<Group, "id">) => save((d) => ({ ...d, groups: [{ ...g, id: crypto.randomUUID() }, ...d.groups] })),
    [save],
  );

  const toggleMemberPaid = useCallback(
    (groupId: string, memberId: string) =>
      save((d) => ({
        ...d,
        groups: d.groups.map((g) =>
          g.id === groupId
            ? { ...g, members: g.members.map((m) => (m.id === memberId ? { ...m, paid: !m.paid } : m)) }
            : g,
        ),
      })),
    [save],
  );

  const addMember = useCallback(
    (groupId: string, name: string, amount: number) =>
      save((d) => ({
        ...d,
        groups: d.groups.map((g) =>
          g.id === groupId
            ? { ...g, members: [...g.members, { id: crypto.randomUUID(), name, paid: false, amount }] }
            : g,
        ),
      })),
    [save],
  );

  return {
    data,
    ready,
    renameAccount,
    lockAccount,
    deposit,
    withdraw,
    addGoal,
    fundGoal,
    addGroup,
    toggleMemberPaid,
    addMember,
  } as const;
}

export function formatMoney(amount: number, currency: Currency): string {
  const n = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: currency === "CDF" ? 0 : 2 }).format(amount);
  return `${n} ${currency}`;
}

export function isLocked(acc: Account): boolean {
  return acc.kind === "verrouille" && !!acc.lockedUntil && acc.lockedUntil > Date.now();
}

export function lockRemaining(until: number): string {
  const ms = Math.max(0, until - Date.now());
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3_600_000);
  if (d > 0) return `${d}j ${h}h`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const METHOD_LABEL: Record<TxMethod, string> = {
  mobile: "Mobile Money",
  carte: "Carte bancaire",
  crypto: "Crypto",
  groupe: "Groupe",
};

export const ACCOUNT_COLORS = ["brand-green", "brand-blue", "brand-gold", "brand-red", "brand-violet"];
export const GOAL_ICONS = ["🏍️", "🏠", "💍", "🛒", "🎓", "✈️", "🚨", "💼", "🚗", "👶"];
export const LOCK_DURATIONS = [
  { label: "1 semaine", days: 7 },
  { label: "1 mois", days: 30 },
  { label: "3 mois", days: 90 },
  { label: "6 mois", days: 180 },
  { label: "12 mois", days: 365 },
];
