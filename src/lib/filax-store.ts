import { useCallback, useEffect, useState } from "react";

export type Currency = "USD" | "CDF";
export type AccentKey = "brand-blue" | "brand-green" | "brand-gold" | "brand-violet" | "brand-red" | "brand-teal";

export interface Account {
  id: string;
  name: string;
  currency: Currency;
  icon: string;
  color: AccentKey;
  balance: number;
  /** Épargne bloquée : objectif + échéance. Retrait impossible avant la date. */
  lockedUntil?: number | null;
  target?: number | null;
}

export type TxType = "depot" | "retrait" | "envoi" | "reception" | "cotisation";
export type TxMethod = "orange" | "airtel" | "mpesa" | "banque" | "filax";

export interface Transaction {
  id: string;
  accountId: string;
  type: TxType;
  amount: number;
  currency: Currency;
  method: TxMethod;
  label: string;
  at: number;
  reference: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: number;
  icon: string;
  currency: Currency;
}

export interface GroupMember {
  id: string;
  name: string;
  amount: number;
  avatar: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  currency: Currency;
  members: GroupMember[];
}

export interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  filaxId: string;
  photo?: string | null;
}

export interface FilaxData {
  profile: Profile;
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  groups: Group[];
}

export const PARTNER_BANK = "EquityBanque Partenaire";

export const MOBILE_MONEY: { id: TxMethod; label: string; color: AccentKey }[] = [
  { id: "orange", label: "Orange Money", color: "brand-gold" },
  { id: "airtel", label: "Airtel Money", color: "brand-red" },
  { id: "mpesa", label: "M-Pesa", color: "brand-green" },
  { id: "banque", label: "Banque partenaire", color: "brand-blue" },
];

export const METHOD_LABEL: Record<TxMethod, string> = {
  orange: "Orange Money",
  airtel: "Airtel Money",
  mpesa: "M-Pesa",
  banque: "Banque partenaire",
  filax: "FILAX",
};

export const ACCOUNT_ICONS = ["💼", "💍", "👨‍👩‍👧", "🏢", "🚀", "🏝️", "🚨", "🏠", "🎓", "✈️", "🏍️", "🛒"];
export const GROUP_ICONS = ["💍", "🕊️", "✈️", "🏝️", "🎉", "🚀", "👨‍👩‍👧", "⛪", "🤝"];
export const ACCENTS: AccentKey[] = ["brand-blue", "brand-green", "brand-gold", "brand-violet", "brand-red", "brand-teal"];

const KEY = "filax-v2";
const DAY = 86_400_000;
const now = Date.now();

function ref() {
  return "FLX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function memberAvatar(seed: string) {
  return `https://i.pravatar.cc/160?u=${encodeURIComponent(seed)}`;
}

const SEED: FilaxData = {
  profile: {
    firstName: "Yannick",
    lastName: "Kabeya",
    phone: "+243 812 345 678",
    country: "RD Congo",
    filaxId: "FLX-8241-KB",
    photo: memberAvatar("filax-owner"),
  },
  accounts: [
    { id: "acc-usd", name: "Compte Principal USD", currency: "USD", icon: "💼", color: "brand-blue", balance: 12450.75 },
    { id: "acc-cdf", name: "Compte Principal CDF", currency: "CDF", icon: "🇨🇩", color: "brand-teal", balance: 2_350_000 },
    { id: "acc-mariage", name: "Compte Mariage", currency: "USD", icon: "💍", color: "brand-violet", balance: 3200, lockedUntil: now + 92 * DAY, target: 6000 },
    { id: "acc-famille", name: "Compte Famille", currency: "USD", icon: "👨‍👩‍👧", color: "brand-green", balance: 860, target: 2000 },
    { id: "acc-business", name: "Compte Business", currency: "USD", icon: "🚀", color: "brand-gold", balance: 4180, target: 10000 },
  ],
  transactions: [
    { id: "t1", accountId: "acc-usd", type: "depot", amount: 500, currency: "USD", method: "mpesa", label: "Dépôt M-Pesa", at: now - 2 * DAY, reference: ref() },
    { id: "t2", accountId: "acc-usd", type: "envoi", amount: 120, currency: "USD", method: "filax", label: "Envoi à Grace M.", at: now - 4 * DAY, reference: ref() },
    { id: "t3", accountId: "acc-business", type: "depot", amount: 1000, currency: "USD", method: "banque", label: "Dépôt banque partenaire", at: now - 8 * DAY, reference: ref() },
    { id: "t4", accountId: "acc-cdf", type: "retrait", amount: 250000, currency: "CDF", method: "orange", label: "Retrait Orange Money", at: now - 11 * DAY, reference: ref() },
    { id: "t5", accountId: "acc-famille", type: "reception", amount: 300, currency: "USD", method: "filax", label: "Reçu de Patrick L.", at: now - 15 * DAY, reference: ref() },
  ],
  goals: [
    { id: "g1", name: "Acheter une moto", target: 1500, saved: 640, deadline: now + 120 * DAY, icon: "🏍️", currency: "USD" },
    { id: "g2", name: "Loyer 2027", target: 2400, saved: 900, deadline: now + 200 * DAY, icon: "🏠", currency: "USD" },
    { id: "g3", name: "Études", target: 2000, saved: 1750, deadline: now + 60 * DAY, icon: "🎓", currency: "USD" },
  ],
  groups: [
    {
      id: "grp1",
      name: "Mariage Grace & Jonas",
      description: "Cotisation pour la cérémonie de décembre.",
      icon: "💍",
      target: 1000,
      currency: "USD",
      members: [
        { id: "m1", name: "Vous", amount: 150, avatar: memberAvatar("filax-owner") },
        { id: "m2", name: "Grace Mukendi", amount: 120, avatar: memberAvatar("Grace") },
        { id: "m3", name: "Patrick Lukusa", amount: 90, avatar: memberAvatar("Patrick") },
        { id: "m4", name: "Sarah Kabeya", amount: 90, avatar: memberAvatar("Sarah") },
      ],
    },
    {
      id: "grp2",
      name: "Voyage Kinshasa",
      description: "Sortie entre amis, départ en mars.",
      icon: "✈️",
      target: 800,
      currency: "USD",
      members: [
        { id: "m1", name: "Vous", amount: 100, avatar: memberAvatar("filax-owner") },
        { id: "m5", name: "David Tshimanga", amount: 80, avatar: memberAvatar("David") },
        { id: "m6", name: "Esther Mwamba", amount: 60, avatar: memberAvatar("Esther") },
      ],
    },
  ],
};

function load(): FilaxData {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED;
    return { ...SEED, ...(JSON.parse(raw) as Partial<FilaxData>) } as FilaxData;
  } catch {
    return SEED;
  }
}

export function useFilax() {
  const [data, setData] = useState<FilaxData>(SEED);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(load());
    setReady(true);
  }, []);

  const save = useCallback((updater: (d: FilaxData) => FilaxData) => {
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

  const pushTx = (d: FilaxData, tx: Omit<Transaction, "id" | "at" | "reference">): FilaxData => ({
    ...d,
    transactions: [{ ...tx, id: crypto.randomUUID(), at: Date.now(), reference: ref() }, ...d.transactions],
  });

  const deposit = useCallback(
    (accountId: string, amount: number, method: TxMethod) =>
      save((d) => {
        const acc = d.accounts.find((a) => a.id === accountId);
        if (!acc) return d;
        const next = {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: a.balance + amount } : a)),
        };
        return pushTx(next, {
          accountId,
          type: "depot",
          amount,
          currency: acc.currency,
          method,
          label: `Dépôt ${METHOD_LABEL[method]}`,
        });
      }),
    [save],
  );

  const withdraw = useCallback(
    (accountId: string, amount: number, method: TxMethod) =>
      save((d) => {
        const acc = d.accounts.find((a) => a.id === accountId);
        if (!acc) return d;
        const next = {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: Math.max(0, a.balance - amount) } : a)),
        };
        return pushTx(next, {
          accountId,
          type: "retrait",
          amount,
          currency: acc.currency,
          method,
          label: `Retrait ${METHOD_LABEL[method]}`,
        });
      }),
    [save],
  );

  const transfer = useCallback(
    (accountId: string, amount: number, recipient: string) =>
      save((d) => {
        const acc = d.accounts.find((a) => a.id === accountId);
        if (!acc) return d;
        const next = {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: Math.max(0, a.balance - amount) } : a)),
        };
        return pushTx(next, {
          accountId,
          type: "envoi",
          amount,
          currency: acc.currency,
          method: "filax",
          label: `Envoi à ${recipient}`,
        });
      }),
    [save],
  );

  const createAccount = useCallback(
    (acc: Omit<Account, "id" | "balance">) =>
      save((d) => ({ ...d, accounts: [...d.accounts, { ...acc, id: crypto.randomUUID(), balance: 0 }] })),
    [save],
  );

  const createGroup = useCallback(
    (g: Omit<Group, "id" | "members">) =>
      save((d) => ({
        ...d,
        groups: [
          {
            ...g,
            id: crypto.randomUUID(),
            members: [{ id: "m1", name: "Vous", amount: 0, avatar: memberAvatar("filax-owner") }],
          },
          ...d.groups,
        ],
      })),
    [save],
  );

  const contribute = useCallback(
    (groupId: string, amount: number, accountId: string) =>
      save((d) => {
        const acc = d.accounts.find((a) => a.id === accountId);
        const group = d.groups.find((g) => g.id === groupId);
        if (!acc || !group) return d;
        const next: FilaxData = {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: Math.max(0, a.balance - amount) } : a)),
          groups: d.groups.map((g) =>
            g.id === groupId
              ? { ...g, members: g.members.map((m) => (m.name === "Vous" ? { ...m, amount: m.amount + amount } : m)) }
              : g,
          ),
        };
        return pushTx(next, {
          accountId,
          type: "cotisation",
          amount,
          currency: acc.currency,
          method: "filax",
          label: `Cotisation ${group.name}`,
        });
      }),
    [save],
  );

  const addMember = useCallback(
    (groupId: string, name: string) =>
      save((d) => ({
        ...d,
        groups: d.groups.map((g) =>
          g.id === groupId
            ? { ...g, members: [...g.members, { id: crypto.randomUUID(), name, amount: 0, avatar: memberAvatar(name) }] }
            : g,
        ),
      })),
    [save],
  );

  const createGoal = useCallback(
    (g: Omit<Goal, "id" | "saved">) => save((d) => ({ ...d, goals: [{ ...g, id: crypto.randomUUID(), saved: 0 }, ...d.goals] })),
    [save],
  );

  const fundGoal = useCallback(
    (goalId: string, amount: number, accountId: string) =>
      save((d) => {
        const acc = d.accounts.find((a) => a.id === accountId);
        const goal = d.goals.find((g) => g.id === goalId);
        if (!acc || !goal) return d;
        const next: FilaxData = {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: Math.max(0, a.balance - amount) } : a)),
          goals: d.goals.map((g) => (g.id === goalId ? { ...g, saved: g.saved + amount } : g)),
        };
        return pushTx(next, {
          accountId,
          type: "cotisation",
          amount,
          currency: acc.currency,
          method: "filax",
          label: `Épargne « ${goal.name} »`,
        });
      }),
    [save],
  );

  const updateProfile = useCallback((p: Partial<Profile>) => save((d) => ({ ...d, profile: { ...d.profile, ...p } })), [save]);

  return {
    data,
    ready,
    deposit,
    withdraw,
    transfer,
    createAccount,
    createGroup,
    contribute,
    addMember,
    createGoal,
    fundGoal,
    updateProfile,
  } as const;
}

export function formatMoney(amount: number, currency: Currency) {
  const n = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: currency === "CDF" ? 0 : 2 }).format(amount);
  return currency === "USD" ? `$${n}` : `${n} FC`;
}

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function isLocked(a: Account) {
  return !!a.lockedUntil && a.lockedUntil > Date.now();
}

export function groupTotal(g: Group) {
  return g.members.reduce((s, m) => s + m.amount, 0);
}

export function pct(current: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}
