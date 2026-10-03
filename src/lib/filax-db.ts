// Couche de données réelle FILAX (Lovable Cloud).
// Chaque hook renvoie null tant qu'aucun utilisateur n'est connecté :
// les pages gardent alors leurs données de démonstration locales.
import { useCallback, useEffect, useState } from "react";
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
        lockedUntil: a.locked_until ? new Date(a.locked_until).getTime() : null,
        status: a.status,
      })) as Account[],
    );
  }, [userId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
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
export async function contributeDb(groupId: string, accountId: string, amount: number) {
  const { error } = await supabase.rpc("contribute", { _group: groupId, _from: accountId, _amount: amount });
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
  return { transactions: txs, refresh };
}

export async function depositDb(accountId: string, amount: number, method: string) {
  const { error } = await supabase.rpc("deposit", { _account: accountId, _amount: amount, _method: method });
  if (error) throw new Error(error.message);
}
export async function withdrawDb(accountId: string, amount: number, method: string) {
  const { error } = await supabase.rpc("withdraw", { _account: accountId, _amount: amount, _method: method });
  if (error) throw new Error(error.message);
}
export async function transferDb(accountId: string, amount: number, filaxId: string, pin: string) {
  const { error } = await supabase.rpc("transfer", { _from: accountId, _to_filax_id: filaxId, _amount: amount, _pin: pin });
  if (error) throw new Error(error.message);
}
export async function transferExternalDb(accountId: string, amount: number, label: string, pin: string) {
  const { error } = await supabase.rpc("transfer_external", { _from: accountId, _amount: amount, _label: label, _pin: pin });
  if (error) throw new Error(error.message);
}
