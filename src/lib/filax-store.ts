import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
export type TxMethod = "orange" | "airtel" | "mpesa" | "banque" | "carte" | "filax";

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
  /** Provenance / destination lisible : personne, banque, opérateur. */
  origin?: string;
}

export interface Goal {
  id: string;
  /** Compte auquel l'objectif est rattaché. */
  accountId: string;
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
  /** Date de la dernière cotisation (tri du plus récent au plus ancien). */
  lastAt?: number;
  filaxId?: string;
}

export type GroupCategory = "Famille" | "Événement" | "Voyage" | "Business" | "Communauté";

export interface Group {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  currency: Currency;
  members: GroupMember[];
  /** Catégorie de regroupement dans la page Groupes. */
  category?: GroupCategory;
  /** Date limite de la cotisation. */
  deadline?: number;
}

export interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  filaxId: string;
  photo?: string | null;
  email?: string;
  /** Identité vérifiée (KYC) — dynamique, jamais décoratif. */
  verified?: boolean;
  /** Code secret à 4 chiffres exigé pour les opérations sensibles. */
  pin?: string;
  /** Date de naissance (KYC). */
  birthDate?: string;
  /** Double authentification activée. */
  twoFactor?: boolean;
  /** Date de la vérification d'identité. */
  verifiedAt?: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: number;
  read: boolean;
  kind: "depot" | "retrait" | "envoi" | "reception" | "cotisation" | "systeme";
}

export interface FilaxData {
  profile: Profile;
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  groups: Group[];
  notifications: AppNotification[];
}

export const PARTNER_BANK = "EquityBanque Partenaire";

export const NOTIF_TITLE: Record<TxType, string> = {
  depot: "Dépôt effectué",
  retrait: "Retrait effectué",
  envoi: "Transfert envoyé",
  reception: "Argent reçu",
  cotisation: "Cotisation enregistrée",
};

export const MOBILE_MONEY: { id: TxMethod; label: string; color: AccentKey }[] = [
  { id: "orange", label: "Orange Money", color: "brand-gold" },
  { id: "airtel", label: "Airtel Money", color: "brand-red" },
  { id: "mpesa", label: "M-Pesa", color: "brand-green" },
  { id: "banque", label: "Banque partenaire", color: "brand-blue" },
  { id: "carte", label: "Carte Visa / Mastercard", color: "brand-violet" },
];

export const METHOD_LABEL: Record<TxMethod, string> = {
  orange: "Orange Money",
  airtel: "Airtel Money",
  mpesa: "M-Pesa",
  banque: "Banque partenaire",
  carte: "Carte Visa / Mastercard",
  filax: "FILAX",
};


export const ACCOUNT_ICONS = ["💼", "💍", "👨‍👩‍👧", "🏢", "🚀", "🏝️", "🚨", "🏠", "🎓", "✈️", "🏍️", "🛒"];
export const GROUP_ICONS = ["💍", "🕊️", "✈️", "🏝️", "🎉", "🚀", "👨‍👩‍👧", "⛪", "🤝"];
export const ACCENTS: AccentKey[] = ["brand-blue", "brand-green", "brand-gold", "brand-violet", "brand-red", "brand-teal"];

const KEY = "filax-v4";
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
    email: "yannick.kabeya@filax.app",
    verified: false,
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
    { id: "g1", accountId: "acc-usd", name: "Acheter une moto", target: 1500, saved: 640, deadline: now + 120 * DAY, icon: "🏍️", currency: "USD" },
    { id: "g2", accountId: "acc-usd", name: "Loyer 2027", target: 2400, saved: 900, deadline: now + 200 * DAY, icon: "🏠", currency: "USD" },
    { id: "g3", accountId: "acc-mariage", name: "Études", target: 2000, saved: 1750, deadline: now + 60 * DAY, icon: "🎓", currency: "USD" },
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
        { id: "m1", name: "Vous", amount: 150, avatar: memberAvatar("filax-owner"), filaxId: "FLX-8241-KB", lastAt: now - 3 * DAY },
        { id: "m2", name: "Grace Mukendi", amount: 120, avatar: memberAvatar("Grace"), filaxId: "FLX-1093-GM", lastAt: now - 1 * DAY },
        { id: "m3", name: "Patrick Lukusa", amount: 90, avatar: memberAvatar("Patrick"), filaxId: "FLX-4417-PL", lastAt: now - 6 * DAY },
        { id: "m4", name: "Sarah Kabeya", amount: 90, avatar: memberAvatar("Sarah"), filaxId: "FLX-7752-SK", lastAt: now - 9 * DAY },
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
        { id: "m1", name: "Vous", amount: 100, avatar: memberAvatar("filax-owner"), filaxId: "FLX-8241-KB", lastAt: now - 5 * DAY },
        { id: "m5", name: "David Tshimanga", amount: 80, avatar: memberAvatar("David"), filaxId: "FLX-2288-DT", lastAt: now - 2 * DAY },
        { id: "m6", name: "Esther Mwamba", amount: 60, avatar: memberAvatar("Esther"), filaxId: "FLX-6631-EM", lastAt: now - 12 * DAY },
      ],
    },
    {
      id: "grp3",
      name: "Voyage Paris",
      description: "Une semaine à Paris en avril, vols et hôtel.",
      icon: "✈️",
      target: 7000,
      currency: "USD",
      category: "Voyage",
      deadline: now + 14 * DAY,
      members: [
        { id: "grp3-m0", name: "Jérôme Kalala", amount: 620, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3000-JX", lastAt: now - 1 * DAY },
        { id: "grp3-m1", name: "Marc Ilunga", amount: 540, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3001-MX", lastAt: now - 2 * DAY },
        { id: "grp3-m2", name: "Sophie Mbuyi", amount: 700, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3002-SX", lastAt: now - 3 * DAY },
        { id: "grp3-m3", name: "Nadia Kasongo", amount: 480, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3003-NX", lastAt: now - 4 * DAY },
        { id: "grp3-m4", name: "Olivier Ngoy", amount: 390, avatar: "https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3004-OX", lastAt: now - 5 * DAY },
        { id: "grp3-m5", name: "Claire Banza", amount: 510, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3005-CX", lastAt: now - 6 * DAY },
        { id: "grp3-m6", name: "Vous", amount: 450, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3006-VX", lastAt: now - 7 * DAY },
      ],
    },
    {
      id: "grp4",
      name: "Achat Terrain",
      description: "Terrain de 20 ares à Kinshasa-Mont Ngafula.",
      icon: "🏡",
      target: 50000,
      currency: "USD",
      category: "Business",
      deadline: now + 60 * DAY,
      members: [
        { id: "grp4-m0", name: "Vous", amount: 3200, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3049-VX", lastAt: now - 1 * DAY },
        { id: "grp4-m1", name: "Joseph Mutombo", amount: 4500, avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3050-JX", lastAt: now - 2 * DAY },
        { id: "grp4-m2", name: "Ruth Kabongo", amount: 2800, avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3051-RX", lastAt: now - 3 * DAY },
        { id: "grp4-m3", name: "Emmanuel Tshibangu", amount: 5100, avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3052-EX", lastAt: now - 4 * DAY },
        { id: "grp4-m4", name: "Aline Nsimba", amount: 2300, avatar: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3053-AX", lastAt: now - 5 * DAY },
        { id: "grp4-m5", name: "Thierry Lukusa", amount: 3900, avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3054-TX", lastAt: now - 6 * DAY },
        { id: "grp4-m6", name: "Mireille Kapinga", amount: 2600, avatar: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3055-MX", lastAt: now - 7 * DAY },
        { id: "grp4-m7", name: "Benjamin Mpoyi", amount: 4100, avatar: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3056-BX", lastAt: now - 8 * DAY },
        { id: "grp4-m8", name: "Laura Kitenge", amount: 1900, avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3057-LX", lastAt: now - 9 * DAY },
        { id: "grp4-m9", name: "Christian Mbala", amount: 3400, avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3058-CX", lastAt: now - 10 * DAY },
      ],
    },
    {
      id: "grp5",
      name: "Cotisation Famille",
      description: "Soutien mensuel aux parents et frais scolaires.",
      icon: "👨‍👩‍👧",
      target: 1500,
      currency: "USD",
      category: "Famille",
      deadline: now + 21 * DAY,
      members: [
        { id: "grp5-m0", name: "Vous", amount: 200, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3021-VX", lastAt: now - 1 * DAY },
        { id: "grp5-m1", name: "Maman Agnès", amount: 150, avatar: "https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3022-MX", lastAt: now - 2 * DAY },
        { id: "grp5-m2", name: "Papa Jean", amount: 180, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3023-PX", lastAt: now - 3 * DAY },
        { id: "grp5-m3", name: "Rachel Kabeya", amount: 120, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3024-RX", lastAt: now - 4 * DAY },
        { id: "grp5-m4", name: "Samuel Kabeya", amount: 140, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3025-SX", lastAt: now - 5 * DAY },
      ],
    },
    {
      id: "grp6",
      name: "Projet Business",
      description: "Lancement d'une boutique de cosmétiques.",
      icon: "💼",
      target: 9000,
      currency: "USD",
      category: "Business",
      deadline: now + 45 * DAY,
      members: [
        { id: "grp6-m0", name: "Vous", amount: 1500, avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3084-VX", lastAt: now - 1 * DAY },
        { id: "grp6-m1", name: "Kevin Lumbala", amount: 1800, avatar: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3085-KX", lastAt: now - 2 * DAY },
        { id: "grp6-m2", name: "Grâce Nkulu", amount: 1200, avatar: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=160&h=160&fit=crop&crop=faces", filaxId: "FLX-3086-GX", lastAt: now - 3 * DAY },
      ],
    },
  ],
  notifications: [
    { id: "n1", title: "Dépôt reçu", body: "500 USD crédités depuis M-Pesa.", at: now - 2 * DAY, read: false, kind: "depot" },
    { id: "n2", title: "Cotisation reçue", body: "Grace M. a cotisé 120 USD au groupe Mariage.", at: now - 3 * DAY, read: false, kind: "cotisation" },
    { id: "n3", title: "Sécurité", body: "Nouvelle connexion détectée sur votre compte FILAX.", at: now - 6 * DAY, read: true, kind: "systeme" },
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

  const pushTx = (d: FilaxData, tx: Omit<Transaction, "id" | "at" | "reference">): FilaxData => {
    const at = Date.now();
    return {
      ...d,
      transactions: [{ ...tx, id: crypto.randomUUID(), at, reference: ref() }, ...d.transactions],
      notifications: [
        {
          id: crypto.randomUUID(),
          title: NOTIF_TITLE[tx.type],
          body: `${tx.label} · ${formatMoney(tx.amount, tx.currency)}`,
          at,
          read: false,
          kind: tx.type,
        },
        ...d.notifications,
      ],
    };
  };

  const deposit = useCallback(
    (accountId: string, amount: number, method: TxMethod) =>
      save((d) => {
        const acc = d.accounts.find((a) => a.id === accountId);
        if (!acc) return d;
        if (!(amount > 0)) {
          toast.error("Montant invalide");
          return d;
        }
        const next = {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: a.balance + amount } : a)),
        };
        toast.success(`Dépôt de ${formatMoney(amount, acc.currency)} sur ${acc.name}`);
        return pushTx(next, {
          accountId,
          type: "depot",
          amount,
          currency: acc.currency,
          method,
          label: `Dépôt ${METHOD_LABEL[method]}`,
          origin: METHOD_LABEL[method],
        });
      }),
    [save],
  );

  const withdraw = useCallback(
    (accountId: string, amount: number, method: TxMethod) =>
      save((d) => {
        const acc = d.accounts.find((a) => a.id === accountId);
        if (!acc) return d;
        if (!(amount > 0)) {
          toast.error("Montant invalide");
          return d;
        }
        if (isLocked(acc)) {
          toast.error("Ce compte est bloqué jusqu'à son échéance");
          return d;
        }
        if (amount > acc.balance) {
          toast.error("Solde insuffisant sur ce compte");
          return d;
        }
        const next = {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: a.balance - amount } : a)),
        };
        toast.success(`Retrait de ${formatMoney(amount, acc.currency)}`);
        return pushTx(next, {
          accountId,
          type: "retrait",
          amount,
          currency: acc.currency,
          method,
          label: `Retrait ${METHOD_LABEL[method]}`,
          origin: METHOD_LABEL[method],
        });
      }),
    [save],
  );

  const transfer = useCallback(
    (accountId: string, amount: number, recipient: string) =>
      save((d) => {
        const acc = d.accounts.find((a) => a.id === accountId);
        if (!acc) return d;
        if (!(amount > 0)) {
          toast.error("Montant invalide");
          return d;
        }
        if (isLocked(acc)) {
          toast.error("Ce compte est bloqué jusqu'à son échéance");
          return d;
        }
        if (amount > acc.balance) {
          toast.error("Solde insuffisant sur ce compte");
          return d;
        }
        const next = {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: a.balance - amount } : a)),
        };
        toast.success(`${formatMoney(amount, acc.currency)} envoyés à ${recipient}`);
        return pushTx(next, {
          accountId,
          type: "envoi",
          amount,
          currency: acc.currency,
          method: "filax",
          label: `Envoi à ${recipient}`,
          origin: recipient,
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
        if (!(amount > 0)) {
          toast.error("Montant invalide");
          return d;
        }
        if (isLocked(acc)) {
          toast.error("Ce compte est bloqué jusqu'à son échéance");
          return d;
        }
        if (amount > acc.balance) {
          toast.error("Solde insuffisant sur ce compte");
          return d;
        }
        toast.success(`Cotisation de ${formatMoney(amount, acc.currency)} · ${group.name}`);
        const next: FilaxData = {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: a.balance - amount } : a)),
          groups: d.groups.map((g) =>
            g.id === groupId
              ? { ...g, members: g.members.map((m) => (m.name === "Vous" ? { ...m, amount: m.amount + amount, lastAt: Date.now() } : m)) }
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
            ? { ...g, members: [...g.members, { id: crypto.randomUUID(), name, amount: 0, avatar: memberAvatar(name), filaxId: ref().replace("FLX-", "FLX-") }] }
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
        if (!(amount > 0)) {
          toast.error("Montant invalide");
          return d;
        }
        if (amount > acc.balance) {
          toast.error("Solde insuffisant sur ce compte");
          return d;
        }
        toast.success(`${formatMoney(amount, acc.currency)} épargnés pour « ${goal.name} »`);
        const next: FilaxData = {
          ...d,
          accounts: d.accounts.map((a) => (a.id === accountId ? { ...a, balance: a.balance - amount } : a)),
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

  const markNotificationsRead = useCallback(
    () => save((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) })),
    [save],
  );

  const clearNotifications = useCallback(() => save((d) => ({ ...d, notifications: [] })), [save]);

  return {
    data,
    ready,
    markNotificationsRead,
    clearNotifications,
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

/** Membres triés : dernière cotisation en premier. */
export function sortedMembers(g: Group) {
  return [...g.members].sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
}

export function groupTotal(g: Group) {
  return g.members.reduce((s, m) => s + m.amount, 0);
}

export function pct(current: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

/* ---------------- Catégories de groupes ---------------- */

export const GROUP_CATEGORIES: GroupCategory[] = ["Famille", "Événement", "Voyage", "Business", "Communauté"];

/** Catégorie explicite si définie, sinon déduite du nom / de l'icône. */
export function groupCategory(g: Group): GroupCategory {
  if (g.category) return g.category;
  const t = `${g.name} ${g.description} ${g.icon}`.toLowerCase();
  if (/(voyage|✈️|🏝️|trip|vacance)/.test(t)) return "Voyage";
  if (/(mariage|💍|anniversaire|🎉|fête|ceremonie|cérémonie|deuil|🕊️)/.test(t)) return "Événement";
  if (/(business|🚀|projet|🏢|invest)/.test(t)) return "Business";
  if (/(famille|👨‍👩‍👧|maison|🏠|enfant)/.test(t)) return "Famille";
  return "Communauté";
}

/** Total cotisé par le membre « Vous ». */
export function myContribution(g: Group) {
  return g.members.find((m) => m.name === "Vous")?.amount ?? 0;
}

/* ---------------- Compte sélectionné (partagé entre les pages) ---------------- */

const ACTIVE_KEY = "filax-active-account";

export function useActiveAccountId(accounts: Account[]) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setId(localStorage.getItem(ACTIVE_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const select = useCallback((next: string) => {
    setId(next);
    try {
      localStorage.setItem(ACTIVE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const activeId = accounts.some((a) => a.id === id) ? (id as string) : (accounts[0]?.id ?? "");
  return { activeId, select } as const;
}

/** Agrégats d'analyse sur une période donnée (ms), pour un compte précis. */
export function analyse(txs: Transaction[], sinceMs: number | null) {
  const from = sinceMs ? Date.now() - sinceMs : 0;
  const list = txs.filter((t) => t.at >= from).sort((a, b) => a.at - b.at);
  const isIn = (t: Transaction) => t.type === "depot" || t.type === "reception";
  const inflow = list.filter(isIn).reduce((s, t) => s + t.amount, 0);
  const outflow = list.filter((t) => !isIn(t)).reduce((s, t) => s + t.amount, 0);
  const byMethod = new Map<TxMethod, number>();
  for (const t of list) byMethod.set(t.method, (byMethod.get(t.method) ?? 0) + t.amount);
  return { list, inflow, outflow, net: inflow - outflow, byMethod } as const;
}
