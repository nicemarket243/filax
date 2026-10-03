import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Trash2, Users } from "lucide-react";
import { PageTitle } from "@/components/filax/ui-kit";
import {
  adminCreateGroup,
  adminDeleteGroup,
  adminListClients,
  adminListGroups,
  adminUpdateGroup,
  useDbUser,
  useIsAdmin,
} from "@/lib/filax-db";

export const Route = createFileRoute("/admin_/groupes")({
  head: () => ({
    meta: [
      { title: "Back-office FILAX — Groupes" },
      { name: "description", content: "Gestion de tous les groupes de cotisation FILAX." },
      { property: "og:title", content: "Back-office FILAX — Groupes" },
      { property: "og:description", content: "Créer, modifier et supprimer les groupes de cotisation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminGroupsPage,
});

type Group = Awaited<ReturnType<typeof adminListGroups>>[number];
type Client = Awaited<ReturnType<typeof adminListClients>>[number];

const CATEGORIES = ["Famille", "Événement", "Voyage", "Business", "Communauté"];

interface FormState {
  id: string | null;
  name: string;
  category: string;
  currency: string;
  target: string;
  deadline: string;
  owner: string;
}

const EMPTY: FormState = { id: null, name: "", category: "Famille", currency: "USD", target: "", deadline: "", owner: "" };

function GroupForm({
  initial,
  clients,
  onClose,
  onSaved,
}: {
  initial: FormState;
  clients: Client[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<FormState>) => setF((s) => ({ ...s, ...patch }));

  const submit = async () => {
    if (!f.name.trim()) {
      toast.error("Nom du groupe requis");
      return;
    }
    if (!f.id && !f.owner) {
      toast.error("Choisis le propriétaire du groupe");
      return;
    }
    setBusy(true);
    try {
      const target = f.target.trim() ? Number(f.target) : null;
      const deadline = f.deadline || null;
      if (f.id) {
        await adminUpdateGroup({ id: f.id, name: f.name, category: f.category, target, deadline });
        toast.success("Groupe modifié");
      } else {
        await adminCreateGroup({ name: f.name, category: f.category, currency: f.currency, target, deadline, owner: f.owner });
        toast.success("Groupe créé");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Action impossible", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-md rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-[0.9rem] font-bold text-foreground">{f.id ? "Modifier le groupe" : "Créer un groupe"}</p>
        <div className="mt-3 space-y-2">
          <input
            value={f.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Nom du groupe"
            className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-[0.8rem] text-foreground outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={f.category} onChange={(e) => set({ category: e.target.value })} className="rounded-xl bg-muted/60 px-3 py-2.5 text-[0.8rem] text-foreground outline-none">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              value={f.target}
              onChange={(e) => set({ target: e.target.value.replace(/[^0-9.]/g, "") })}
              placeholder="Objectif (optionnel)"
              inputMode="decimal"
              className="rounded-xl bg-muted/60 px-3 py-2.5 text-[0.8rem] text-foreground outline-none"
            />
          </div>
          <input
            type="date"
            value={f.deadline}
            onChange={(e) => set({ deadline: e.target.value })}
            className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-[0.8rem] text-foreground outline-none"
          />
          {!f.id && (
            <select value={f.owner} onChange={(e) => set({ owner: e.target.value })} className="w-full rounded-xl bg-muted/60 px-3 py-2.5 text-[0.8rem] text-foreground outline-none">
              <option value="">Propriétaire du groupe…</option>
              {clients.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email} {c.filax_id ? `· ${c.filax_id}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="press rounded-xl border border-border py-2.5 text-[0.75rem] font-bold text-muted-foreground">
            Annuler
          </button>
          <button type="button" disabled={busy} onClick={() => void submit()} className="press rounded-xl bg-brand-green py-2.5 text-[0.75rem] font-bold text-white disabled:opacity-50">
            {busy ? "En cours…" : f.id ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminGroupsPage() {
  const userId = useDbUser();
  const isAdmin = useIsAdmin(userId);
  const [groups, setGroups] = useState<Group[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState | null>(null);

  const load = useCallback(async () => {
    try {
      const [g, c] = await Promise.all([adminListGroups(), adminListClients()]);
      setGroups(g);
      setClients(c);
    } catch (e) {
      toast.error("Chargement impossible", { description: (e as Error).message });
    }
  }, []);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const filtered = groups.filter((g) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [g.name, g.category, g.owner_name, g.owner_filax_id].some((v) => v?.toLowerCase().includes(q));
  });

  const remove = async (g: Group) => {
    if (!window.confirm(`Supprimer définitivement le groupe « ${g.name} » ? Ses cotisations et membres seront effacés.`)) return;
    try {
      await adminDeleteGroup(g.id);
      toast.success("Groupe supprimé");
      void load();
    } catch (e) {
      toast.error("Suppression impossible", { description: (e as Error).message });
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-16 pt-6">
      <Link to="/admin" className="press flex items-center gap-1 text-[0.75rem] font-semibold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back-office
      </Link>
      <PageTitle title="Groupes" subtitle="Tous les groupes de cotisation de la plateforme." />
      {isAdmin === null ? (
        <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Chargement…</p>
      ) : !isAdmin ? (
        <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Accès réservé aux administrateurs FILAX.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un groupe, un propriétaire…"
              className="flex-1 rounded-xl bg-muted/60 px-3 py-2.5 text-[0.8rem] text-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => setForm({ ...EMPTY })}
              className="press flex items-center gap-1 rounded-xl bg-brand-green px-3 py-2.5 text-[0.75rem] font-bold text-white"
            >
              <Plus className="h-4 w-4" /> Créer
            </button>
          </div>
          <p className="text-[0.68rem] text-muted-foreground">
            {filtered.length} groupe{filtered.length > 1 ? "s" : ""} · {groups.reduce((s, g) => s + Number(g.members_count), 0)} membres au total
          </p>
          {filtered.map((g) => (
            <div key={g.id} className="rounded-2xl bg-surface p-4 soft-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="leading-tight">
                  <p className="text-[0.85rem] font-bold text-foreground">{g.name}</p>
                  <p className="text-[0.65rem] text-muted-foreground">
                    {g.category} · {g.owner_name} {g.owner_filax_id ? `(${g.owner_filax_id})` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        id: g.id,
                        name: g.name,
                        category: g.category,
                        currency: g.currency,
                        target: g.target != null ? String(g.target) : "",
                        deadline: g.deadline ?? "",
                        owner: g.owner_id,
                      })
                    }
                    className="press rounded-lg bg-muted/60 p-2 text-foreground"
                    aria-label="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => void remove(g)} className="press rounded-lg bg-muted/60 p-2 text-brand-red" aria-label="Supprimer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[0.68rem] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {g.members_count} membre{Number(g.members_count) > 1 ? "s" : ""} · {g.contributions_count} cotisation{Number(g.contributions_count) > 1 ? "s" : ""}
                </span>
                <span className="font-bold text-foreground">
                  {g.collected} {g.currency}
                  {g.target != null ? ` / ${g.target}` : ""}
                </span>
              </div>
              {g.deadline && <p className="mt-1 text-[0.62rem] text-muted-foreground">Échéance : {new Date(g.deadline).toLocaleDateString("fr-FR")}</p>}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-[0.75rem] text-muted-foreground">Aucun groupe trouvé.</p>}
        </div>
      )}
      {form && <GroupForm initial={form} clients={clients} onClose={() => setForm(null)} onSaved={load} />}
    </main>
  );
}
