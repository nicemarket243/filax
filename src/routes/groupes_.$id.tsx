import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Crown, Pencil, Trash2, UserPlus } from "lucide-react";
import { AppHeader, BottomNav } from "@/components/filax/shell";
import { BackButton } from "@/components/back-button";
import { Field, PageTitle, PrimaryButton, ProgressBar, TextInput } from "@/components/filax/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useDbUser } from "@/lib/filax-db";
import { formatMoney, type Currency } from "@/lib/filax-store";

export const Route = createFileRoute("/groupes_/$id")({
  head: () => ({
    meta: [
      { title: "Membres du groupe — FILAX" },
      { name: "description", content: "Ajoutez, modifiez et retirez les membres d'un groupe FILAX et suivez le solde partagé." },
      { property: "og:title", content: "Membres du groupe — FILAX" },
      { property: "og:description", content: "Gestion des membres et solde partagé du groupe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroupMembersPage,
});

type G = { id: string; name: string; currency: string; target: number | null; collected: number; deadline: string | null; owner_id: string };
type M = { user_id: string; name: string | null; filax_id: string | null; contributed: number; joined_at: string; is_owner: boolean };

function GroupMembersPage() {
  const { id } = Route.useParams();
  const userId = useDbUser();
  const [group, setGroup] = useState<G | null>(null);
  const [members, setMembers] = useState<M[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState("");
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const [{ data: g, error: e1 }, { data: m, error: e2 }] = await Promise.all([
      supabase.from("groups").select("id,name,currency,target,collected,deadline,owner_id").eq("id", id).maybeSingle(),
      supabase.rpc("group_member_list", { _group: id }),
    ]);
    if (e1 || e2 || !g) return setError(e2?.message ?? e1?.message ?? "Groupe introuvable");
    setGroup(g as G);
    setMembers((m ?? []) as M[]);
    setName(g.name);
    setTarget(g.target ? String(g.target) : "");
  }, [id, userId]);

  useEffect(() => {
    void load();
    if (!userId) return;
    const ch = supabase
      .channel(`group-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "groups", filter: `id=eq.${id}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_contributions", filter: `group_id=eq.${id}` }, () => void load())
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [id, userId, load]);

  const owner = !!group && group.owner_id === userId;
  const run = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast.error("Action impossible", { description: error.message });
    toast.success(ok);
    void load();
  };

  if (!userId) return <Shell><p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Connectez-vous pour voir ce groupe.</p></Shell>;
  if (error) return <Shell><p className="mt-6 text-center text-[0.8rem] text-brand-red">{error}</p></Shell>;
  if (!group) return <Shell><p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Chargement…</p></Shell>;

  const cur = group.currency as Currency;
  return (
    <Shell>
      <PageTitle title={group.name} subtitle={`${members.length} membre${members.length > 1 ? "s" : ""}`} />

      <section className="mt-4 rounded-3xl bg-surface p-4 soft-shadow">
        <p className="text-[0.65rem] font-semibold text-muted-foreground">Solde partagé</p>
        <p className="text-[1.6rem] font-extrabold tracking-tight text-foreground">{formatMoney(Number(group.collected), cur)}</p>
        {group.target ? (
          <>
            <ProgressBar value={Math.min(100, (Number(group.collected) / Number(group.target)) * 100)} color="brand-violet" />
            <p className="mt-1.5 text-[0.62rem] text-muted-foreground">Objectif {formatMoney(Number(group.target), cur)}</p>
          </>
        ) : null}
        {owner && (
          <button type="button" onClick={() => setEdit((v) => !v)} className="press mt-3 flex items-center gap-1.5 text-[0.7rem] font-bold text-brand-violet">
            <Pencil className="h-3.5 w-3.5" /> Modifier le groupe
          </button>
        )}
        {owner && edit && (
          <div className="mt-3 space-y-2.5">
            <Field label="Nom"><TextInput value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label={`Objectif (${group.currency})`}><TextInput value={target} inputMode="decimal" onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))} /></Field>
            <PrimaryButton
              color="brand-violet"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const r = await supabase.rpc("owner_update_group", { _id: id, _name: name, _target: target ? Number(target) : null as unknown as number, _deadline: group.deadline as string });
                  if (!r.error) setEdit(false);
                  return r;
                }, "Groupe modifié")
              }
            >
              Enregistrer
            </PrimaryButton>
          </div>
        )}
      </section>

      {owner && (
        <section className="mt-3 rounded-3xl bg-surface p-4 soft-shadow">
          <Field label="Ajouter un membre (ID FILAX ou pseudo)">
            <div className="flex gap-2">
              <TextInput value={invite} maxLength={40} placeholder="FLX-…" onChange={(e) => setInvite(e.target.value.trim())} />
              <button
                type="button"
                disabled={busy || invite.length < 3}
                onClick={() => run(async () => { const r = await supabase.rpc("invite_to_group", { _group: id, _identifier: invite }); if (!r.error) setInvite(""); return r; }, "Membre ajouté")}
                className="press flex shrink-0 items-center gap-1 rounded-2xl bg-brand-violet px-3 text-[0.72rem] font-bold text-white disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" /> Ajouter
              </button>
            </div>
          </Field>
        </section>
      )}

      <section className="mt-3 space-y-2">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between rounded-2xl bg-surface px-3.5 py-3 soft-shadow">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-violet/15 text-[0.75rem] font-bold text-brand-violet">
                {(m.name ?? m.filax_id ?? "?").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="flex items-center gap-1 truncate text-[0.8rem] font-bold text-foreground">
                  {m.name ?? "Membre FILAX"} {m.is_owner && <Crown className="h-3.5 w-3.5 text-brand-gold" />}
                </p>
                <p className="text-[0.62rem] text-muted-foreground">{m.filax_id} · a versé {formatMoney(Number(m.contributed), cur)}</p>
              </div>
            </div>
            {owner && !m.is_owner && (
              <button
                type="button"
                aria-label="Retirer le membre"
                disabled={busy}
                onClick={() => {
                  if (confirm(`Retirer ${m.name ?? m.filax_id} du groupe ?`))
                    void run(async () => await supabase.from("group_members").delete().eq("group_id", id).eq("user_id", m.user_id), "Membre retiré");
                }}
                className="press flex h-8 w-8 items-center justify-center rounded-xl border border-border text-brand-red"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />
      <BackButton fallbackTo="/groupes" />
      {children}
      <BottomNav />
    </main>
  );
}
