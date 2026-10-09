// Couche de données réelle FILAX (Lovable Cloud).
// Chaque hook renvoie null tant qu'aucun utilisateur n'est connecté :
// les pages gardent alors leurs données de démonstration locales.
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Account, Currency, Group, GroupCategory, GroupMember, Profile } from "./filax-store";

export interface DbProfile extends Profile {
  userId: string;
  username: string | null;
  partnerBank: string | null;
  partnerSubaccount: string | null;
  kycStatus: "not_started" | "pending" | "verified" | "rejected";
  birthCity: string | null;
}

/** Utilisateur connecté (ou null). */
export function useDbUser() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return userId;
}

/** État d'authentification avec indicateur de résolution, pour éviter un écran public fugace. */
export function useDbAuthState() {
  const [state, setState] = useState<{ userId: string | null; ready: boolean }>({ userId: null, ready: false });
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setState({ userId: data.user?.id ?? null, ready: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      setState({ userId: session?.user.id ?? null, ready: true });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return state;
}

/** Profil réel depuis la base, null si non connecté. */
export function useDbProfile(userId: string | null) {
  const [profile, setProfile] = useState<DbProfile | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (!data) {
      setProfile(null);
      return;
    }
    setProfile({
      userId: data.user_id,
      firstName: data.first_name ?? "",
      lastName: data.last_name ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
      country: data.country ?? "CD",
      filaxId: data.filax_id ?? "",
      username: data.username,
      partnerBank: data.partner_bank,
      partnerSubaccount: data.partner_subaccount,
      photo: null,
      verified: data.kyc_status === "verified",
      verifiedAt: data.kyc_validated_at ? new Date(data.kyc_validated_at).getTime() : undefined,
      birthDate: data.birth_date ?? "",
      birthCity: data.birth_city,
      twoFactor: data.two_factor,
      kycStatus: (data.kyc_status as DbProfile["kycStatus"]) ?? "not_started",
    });
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, refresh };
}

/** Met à jour les informations personnelles du profil. */
export async function saveDbProfile(
  updates: { firstName?: string; lastName?: string; phone?: string; email?: string; birthDate?: string },
) {
  const payload: { first_name?: string; last_name?: string; phone?: string; email?: string; birth_date?: string | null } = {};
  if (updates.firstName !== undefined) payload.first_name = updates.firstName;
  if (updates.lastName !== undefined) payload.last_name = updates.lastName;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.birthDate !== undefined) payload.birth_date = updates.birthDate || null;
  const { error } = await supabase.from("profiles").update(payload).eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
  if (error) throw new Error(error.message);
}

/** KYC réel : envoi des documents dans le coffre sécurisé puis soumission. */
export async function submitDbKyc(userId: string, docType: string, doc: File, selfie: File) {
  const ext = (f: File) => f.name.split(".").pop() ?? "jpg";
  const docPath = `${userId}/piece-${Date.now()}.${ext(doc)}`;
  const selfiePath = `${userId}/selfie-${Date.now()}.${ext(selfie)}`;
  const up1 = await supabase.storage.from("kyc-documents").upload(docPath, doc, { upsert: true });
  if (up1.error) throw new Error(up1.error.message);
  const up2 = await supabase.storage.from("kyc-documents").upload(selfiePath, selfie, { upsert: true });
  if (up2.error) throw new Error(up2.error.message);
  const { error } = await supabase.rpc("submit_kyc", { _doc_type: docType, _doc_path: docPath, _selfie_path: selfiePath });
  if (error) throw new Error(error.message);
}

/** Code secret à 4 chiffres, enregistré chiffré côté serveur. */
export async function setDbPin(pin: string) {
  const { error } = await supabase.rpc("set_pin", { _pin: pin });
  if (error) throw new Error(error.message);
}

/** Active ou désactive la double authentification. */
export async function setDbTwoFactor(enabled: boolean) {
  const { error } = await supabase
    .from("profiles")
    .update({ two_factor: enabled })
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
  if (error) throw new Error(error.message);
}

/** Comptes réels de l'utilisateur. */
export function useDbAccounts(userId: string | null) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const refresh = useCallback(async () => {
    if (!userId) {
      setAccounts(null);
      return;
    }
    const { data } = await supabase.from("accounts").select("*").eq("user_id", userId).order("created_at");
    setAccounts(
      (data ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency as Currency,
        icon: a.kind === "savings" ? "piggy" : "wallet",
        color: a.currency === "USD" ? "brand-blue" : "brand-green",
        balance: Number(a.balance),
        visualKey: a.visual_key,
        parentAccountId: a.parent_account_id,
        hasDedicatedPin: a.has_dedicated_pin,
        target: a.target,
        kind: a.kind,
        lockedUntil: a.locked_until ? new Date(a.locked_until).getTime() : null,
        status: a.status,
      })) as Account[],
    );
  }, [userId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`accounts-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts", filter: `user_id=eq.${userId}` }, () => void refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId, refresh]);
  return { accounts, refresh };
}

/** Groupes réels (créés ou rejoints), avec membres et cotisations. */
export function useDbGroups(userId: string | null) {
  const [groups, setGroups] = useState<Group[] | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setGroups(null);
      return;
    }
    const { data: rows } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    if (!rows) {
      setGroups(null);
      return;
    }
    const mapped: Group[] = await Promise.all(
      rows.map(async (g) => {
        const [{ data: members }, { data: contribs }] = await Promise.all([
          supabase.from("group_members").select("user_id, joined_at").eq("group_id", g.id),
          supabase.from("group_contributions").select("user_id, contributor_name, amount, created_at").eq("group_id", g.id),
        ]);
        const byUser = new Map<string, GroupMember>();
        for (const m of members ?? []) {
          byUser.set(m.user_id, {
            id: m.user_id,
            name: "Membre FILAX",
            amount: 0,
            avatar: "",
            lastAt: new Date(m.joined_at).getTime(),
          });
        }
        for (const c of contribs ?? []) {
          const at = new Date(c.created_at).getTime();
          const existing = byUser.get(c.user_id);
          byUser.set(c.user_id, {
            id: c.user_id,
            name: c.contributor_name || existing?.name || "Membre FILAX",
            amount: (existing?.amount ?? 0) + Number(c.amount),
            avatar: "",
            lastAt: Math.max(existing?.lastAt ?? 0, at),
          });
        }
        return {
          id: g.id,
          ownerId: g.owner_id,
          name: g.name,
          description: "",
          icon: "users",
          target: Number(g.target ?? 0),
          currency: g.currency as Currency,
          category: (g.category as GroupCategory) ?? "Famille",
          deadline: g.deadline ? new Date(g.deadline).getTime() : undefined,
          collected: Number(g.collected),
          members: [...byUser.values()],
        } as Group;
      }),
    );
    setGroups(mapped);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { groups, refresh };
}

/** Crée un groupe réel ; le propriétaire est aussi membre pour pouvoir cotiser. */
export async function createDbGroup(input: { name: string; category: GroupCategory; target: number; currency: Currency; deadline?: number }) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Non connecté");
  const { data, error } = await supabase
    .from("groups")
    .insert({
      owner_id: userId,
      name: input.name,
      category: input.category,
      currency: input.currency,
      target: input.target || null,
      deadline: input.deadline ? new Date(input.deadline).toISOString().slice(0, 10) : null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("group_members").insert({ group_id: data.id, user_id: userId });
  return data.id;
}

/** Cotisation réelle : débit du compte, frais 0,5 %, notification des membres. */
export async function contributeDb(groupId: string, accountId: string, amount: number, pin = "") {
  const { error } = await supabase.rpc("account_outflow", { _operation: "contribute", _related: groupId, _account: accountId, _amount: amount, _pin: pin });
  if (error) throw new Error(error.message);
}

/** Invitation par username ou FILAX-ID. */
export async function inviteDb(groupId: string, identifier: string) {
  const { error } = await supabase.rpc("invite_to_group", { _group: groupId, _identifier: identifier.trim() });
  if (error) throw new Error(error.message);
}

const TX_TYPE: Record<string, import("./filax-store").TxType> = {
  deposit: "depot",
  withdraw: "retrait",
  transfer_out: "envoi",
  transfer_in: "reception",
  contribution: "cotisation",
  goal_fund: "envoi",
  group_withdraw: "reception",
};
const KNOWN_METHODS = ["orange", "airtel", "mpesa", "banque", "carte", "filax"];

/** Opérations réelles de l'utilisateur, triées de la plus récente à la plus ancienne. */
export function useDbTransactions(userId: string | null, accounts: Account[] | null) {
  const [txs, setTxs] = useState<import("./filax-store").Transaction[] | null>(null);
  const refresh = useCallback(async () => {
    if (!userId) {
      setTxs(null);
      return;
    }
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(300);
    setTxs(
      (data ?? []).map((t) => ({
        id: t.id,
        accountId: t.account_id,
        type: TX_TYPE[t.type] ?? "depot",
        amount: Number(t.amount),
        currency: (accounts?.find((a) => a.id === t.account_id)?.currency ?? "USD") as Currency,
        method: (KNOWN_METHODS.includes(t.method ?? "") ? t.method : t.method === "groupe" ? "filax" : "banque") as import("./filax-store").TxMethod,
        label: t.label ?? "",
        at: new Date(t.created_at).getTime(),
        reference: t.id.slice(0, 8).toUpperCase(),
        origin: t.counterparty ?? undefined,
      })),
    );
  }, [userId, accounts]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`transactions-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` }, () => void refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId, refresh]);
  return { transactions: txs, refresh };
}

export async function depositDb(accountId: string, amount: number, method: string) {
  const { error } = await supabase.rpc("deposit", { _account: accountId, _amount: amount, _method: method });
  if (error) throw new Error(error.message);
}
export async function withdrawDb(accountId: string, amount: number, method: string, pin = "") {
  const { error } = await supabase.rpc("account_outflow", { _operation: "withdraw", _account: accountId, _amount: amount, _destination: method, _pin: pin });
  if (error) throw new Error(error.message);
}
export async function transferDb(accountId: string, amount: number, filaxId: string, pin: string, accountPin = "") {
  const { error } = await supabase.rpc("account_outflow", { _operation: "transfer", _account: accountId, _destination: filaxId, _amount: amount, _global_pin: pin, _pin: accountPin });
  if (error) throw new Error(error.message);
}
export async function transferExternalDb(accountId: string, amount: number, label: string, pin: string, accountPin = "") {
  const { error } = await supabase.rpc("account_outflow", { _operation: "external", _account: accountId, _amount: amount, _destination: label, _global_pin: pin, _pin: accountPin });
  if (error) throw new Error(error.message);
}

/** Objectifs d'épargne réels, mis à jour en direct. */
export function useDbGoals(userId: string | null) {
  const [goals, setGoals] = useState<import("./filax-store").Goal[] | null>(null);
  const refresh = useCallback(async () => {
    if (!userId) {
      setGoals(null);
      return;
    }
    const { data } = await supabase.from("goals").select("*").eq("user_id", userId).order("created_at");
    setGoals(
      (data ?? []).map((g) => ({
        id: g.id,
        accountId: g.account_id,
        name: g.name,
        target: Number(g.target),
        saved: Number(g.saved),
        deadline: g.deadline ? new Date(g.deadline).getTime() : Date.now(),
        icon: g.icon,
        currency: g.currency as Currency,
      })),
    );
  }, [userId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`goals-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals", filter: `user_id=eq.${userId}` }, () => void refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId, refresh]);
  return { goals, refresh };
}

export async function createGoalDb(userId: string, g: { accountId: string; name: string; target: number; deadline: number; icon: string; currency: Currency }) {
  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    account_id: g.accountId,
    name: g.name,
    target: g.target,
    deadline: new Date(g.deadline).toISOString().slice(0, 10),
    icon: g.icon,
    currency: g.currency,
  });
  if (error) throw new Error(error.message);
}

export async function fundGoalDb(goalId: string, amount: number, accountId: string, pin = "") {
  const { error } = await supabase.rpc("account_outflow", { _operation: "goal", _related: goalId, _account: accountId, _amount: amount, _pin: pin });
  if (error) throw new Error(error.message);
}

/** Enregistre la banque partenaire choisie par l'utilisateur. */
export async function setPartnerBank(bank: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ partner_bank: bank })
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
  if (error) throw new Error(error.message);
}

/** Crée un compte réel (épargne libre ou bloquée). */
export const subaccountSchema = z.object({
  parentAccountId: z.string().uuid(), name: z.string().trim().min(2).max(80),
  target: z.number().finite().positive().max(1000000000000), pin: z.string().regex(/^\d{4}$/),
  visualKey: z.string().min(1).max(30), currency: z.enum(["USD", "CDF"]),
  icon: z.string(), color: z.string(), lockedUntil: z.number().nullable().optional(),
});
export type SubaccountInput = z.infer<typeof subaccountSchema>;
export async function createDbAccount(input: SubaccountInput) {
  const a = subaccountSchema.parse(input);
  const { data, error } = await supabase.rpc("create_subaccount", { _parent: a.parentAccountId, _name: a.name, _target: a.target, _pin: a.pin, _visual: a.visualKey, _locked_until: a.lockedUntil ? new Date(a.lockedUntil).toISOString() : undefined });
  if (error) throw new Error(error.message);
  return data;
}
export async function setAccountVisualDb(accountId: string, visualKey: string) {
  const { error } = await supabase.rpc("set_account_visual", { _account: z.string().uuid().parse(accountId), _visual: z.string().max(30).parse(visualKey) });
  if (error) throw new Error(error.message);
}

/* ---------------- Back-office ---------------- */

export function useIsAdmin(userId: string | null) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [userId]);
  return isAdmin;
}

export async function requestGroupWithdrawalDb(groupId: string, accountId: string, amount: number, reason: string) {
  const { error } = await supabase.rpc("request_group_withdrawal", { _group: groupId, _account: accountId, _amount: amount, _reason: reason });
  if (error) throw new Error(error.message);
}
export async function adminListKyc() {
  const { data, error } = await supabase.rpc("admin_list_kyc");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function adminDecideKyc(user: string, approved: boolean) {
  const { error } = await supabase.rpc("admin_decide_kyc", { _user: user, _approved: approved });
  if (error) throw new Error(error.message);
}
export async function adminListWithdrawals() {
  const { data, error } = await supabase.rpc("admin_list_withdrawals");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function adminDecideWithdrawal(id: string, approved: boolean) {
  const { error } = await supabase.rpc("admin_decide_withdrawal", { _id: id, _approved: approved });
  if (error) throw new Error(error.message);
}
export async function kycFileUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

export async function adminListClients() {
  const { data, error } = await supabase.rpc("admin_list_clients");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export interface AdminClientDetail {
  groups: { name: string; category: string; currency: string; collected: number; target: number | null; owner: boolean; members: number }[];
  transactions: { type: string; amount: number; fee: number; method: string | null; label: string | null; created_at: string; currency: string; account: string }[];
}
export async function adminClientDetail(user: string) {
  const { data, error } = await supabase.rpc("admin_client_detail", { _user: user });
  if (error) throw new Error(error.message);
  return data as unknown as AdminClientDetail;
}

export async function adminListGroups() {
  const { data, error } = await supabase.rpc("admin_list_groups");
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function adminCreateGroup(input: { name: string; category: string; currency: string; target: number | null; deadline: string | null; owner: string | null }) {
  const { data, error } = await supabase.rpc("admin_create_group", {
    _name: input.name, _category: input.category, _currency: input.currency,
    _target: input.target, _deadline: input.deadline, _owner: input.owner,
  } as never);
  if (error) throw new Error(error.message);
  return data as string;
}
export async function adminUpdateGroup(input: { id: string; name: string; category: string; target: number | null; deadline: string | null; }) {
  const { error } = await supabase.rpc("admin_update_group", {
    _id: input.id, _name: input.name, _category: input.category, _target: input.target, _deadline: input.deadline,
  } as never);
  if (error) throw new Error(error.message);
}
export async function adminDeleteGroup(id: string) {
  const { error } = await supabase.rpc("admin_delete_group", { _id: id });
  if (error) throw new Error(error.message);
}

/** Notifications réelles, mises à jour en direct. */
export function useDbNotifications(userId: string | null) {
  const [items, setItems] = useState<import("./filax-store").AppNotification[] | null>(null);
  const refresh = useCallback(async () => {
    if (!userId) return setItems(null);
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems(
      (data ?? []).map((n) => {
        const t = n.title.toLowerCase();
        const kind = t.includes("dépôt") ? "depot" : t.includes("retrait") ? "retrait" : t.includes("reçu") ? "reception" : t.includes("cotis") ? "cotisation" : t.includes("envoi") || t.includes("transfert") ? "envoi" : "systeme";
        return { id: n.id, title: n.title, body: n.body ?? "", read: n.read, at: new Date(n.created_at).getTime(), kind };
      }),
    );
  }, [userId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) => {
        if (p.eventType === "INSERT") {
          const n = p.new as { title?: string; body?: string };
          void import("sonner").then(({ toast }) => toast(n.title ?? "Notification", { description: n.body ?? undefined }));
        }
        void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userId, refresh]);
  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    await refresh();
  }, [userId, refresh]);
  return { notifications: items, markAllRead };
}
