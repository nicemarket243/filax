import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Search } from "lucide-react";
import { Modal, PageTitle, TextInput } from "@/components/filax/ui-kit";
import { adminClientDetail, adminListClients, useDbUser, useIsAdmin, type AdminClientDetail } from "@/lib/filax-db";

export const Route = createFileRoute("/admin_/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Back-office FILAX" },
      { name: "description", content: "Comptes, groupes et opérations de tous les clients FILAX." },
      { property: "og:title", content: "Clients — Back-office FILAX" },
      { property: "og:description", content: "Vue d'ensemble des clients FILAX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientsPage,
});

type Client = Awaited<ReturnType<typeof adminListClients>>[number];
type Acc = { name: string; currency: string; balance: number; status: string };

const TYPE: Record<string, string> = {
  deposit: "Dépôt",
  withdraw: "Retrait",
  transfer_out: "Envoi",
  transfer_in: "Réception",
  contribution: "Cotisation",
  goal_fund: "Épargne objectif",
  group_withdraw: "Retrait cagnotte",
};
const KYC: Record<string, string> = { not_started: "Non vérifié", pending: "En cours", verified: "Validé", rejected: "Refusé" };
const money = (n: number, c: string) => `${Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${c === "CDF" ? "FC" : "$"}`;
const nameOf = (c: Client) => `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email || "Client";

function ClientsPage() {
  const userId = useDbUser();
  const isAdmin = useIsAdmin(userId);
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Client | null>(null);
  const [detail, setDetail] = useState<AdminClientDetail | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    adminListClients().then(setClients).catch((e) => toast.error("Chargement impossible", { description: e.message }));
  }, [isAdmin]);
  useEffect(() => {
    setDetail(null);
    if (sel) adminClientDetail(sel.user_id).then(setDetail).catch((e) => toast.error("Chargement impossible", { description: e.message }));
  }, [sel]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? clients.filter((c) => [nameOf(c), c.email, c.phone, c.filax_id].some((f) => f?.toLowerCase().includes(s))) : clients;
  }, [clients, q]);
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const c of clients) for (const a of c.accounts as unknown as Acc[]) t[a.currency] = (t[a.currency] ?? 0) + Number(a.balance);
    return t;
  }, [clients]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-16 pt-6">
      <Link to="/admin" className="press flex items-center gap-1 text-[0.75rem] font-semibold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <PageTitle title="Clients" subtitle="Comptes, groupes et opérations de tous les utilisateurs." />
      {isAdmin === null ? (
        <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Chargement…</p>
      ) : !isAdmin ? (
        <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Accès réservé aux administrateurs FILAX.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-surface p-3 soft-shadow">
              <p className="text-[0.6rem] text-muted-foreground">Clients</p>
              <p className="text-[0.95rem] font-bold text-foreground">{clients.length}</p>
            </div>
            {Object.entries(totals).map(([cur, v]) => (
              <div key={cur} className="rounded-2xl bg-surface p-3 soft-shadow">
                <p className="text-[0.6rem] text-muted-foreground">Dépôts {cur}</p>
                <p className="text-[0.85rem] font-bold text-foreground">{money(v, cur)}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <TextInput className="pl-9" placeholder="Nom, e-mail, téléphone, ID FILAX" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="mt-3 space-y-2">
            {list.map((c) => (
              <button key={c.user_id} type="button" onClick={() => setSel(c)} className="press w-full rounded-2xl bg-surface p-3 text-left soft-shadow">
                <div className="flex items-center justify-between">
                  <div className="leading-tight">
                    <p className="text-[0.8rem] font-bold text-foreground">{nameOf(c)}</p>
                    <p className="text-[0.62rem] text-muted-foreground">{c.filax_id ?? "—"} · {c.email}</p>
                  </div>
                  <span className="text-[0.62rem] font-bold text-muted-foreground">{KYC[c.kyc_status] ?? c.kyc_status}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(c.accounts as unknown as Acc[]).map((a, i) => (
                    <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[0.62rem] font-semibold text-foreground">{money(a.balance, a.currency)}</span>
                  ))}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[0.62rem] text-muted-foreground">{c.groups_count} groupe(s) · {c.tx_count} opération(s)</span>
                </div>
              </button>
            ))}
            {list.length === 0 && <p className="text-center text-[0.72rem] text-muted-foreground">Aucun client.</p>}
          </div>
        </>
      )}

      <Modal open={!!sel} onOpenChange={(o) => !o && setSel(null)} title={sel ? nameOf(sel) : ""} subtitle={sel ? `${sel.filax_id ?? "—"} · ${sel.phone ?? sel.email ?? ""}` : ""}>
        {sel && (
          <div className="space-y-4">
            <section className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
              <div>
                <p className="text-[0.62rem] text-muted-foreground">Statut KYC</p>
                <p className="text-[0.76rem] font-bold text-foreground">{KYC[sel.kyc_status] ?? sel.kyc_status}</p>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${sel.kyc_status === "verified" ? "bg-brand-green" : sel.kyc_status === "rejected" ? "bg-brand-red" : "bg-brand-gold"}`} />
            </section>
            <section>
              <p className="mb-1.5 text-[0.7rem] font-bold text-muted-foreground">Comptes</p>
              <div className="space-y-1.5">
                {(sel.accounts as unknown as Acc[]).map((a, i) => (
                  <div key={i} className="flex justify-between rounded-xl bg-muted/50 px-3 py-2 text-[0.75rem]">
                    <span className="text-foreground">{a.name}{a.status !== "active" ? " · bloqué" : ""}</span>
                    <span className="font-bold text-foreground">{money(a.balance, a.currency)}</span>
                  </div>
                ))}
              </div>
            </section>
            {!detail ? (
              <p className="text-[0.72rem] text-muted-foreground">Chargement…</p>
            ) : (
              <>
                <section>
                  <p className="mb-1.5 text-[0.7rem] font-bold text-muted-foreground">Groupes ({detail.groups.length})</p>
                  <div className="space-y-1.5">
                    {detail.groups.map((g, i) => (
                      <div key={i} className="flex justify-between rounded-xl bg-muted/50 px-3 py-2 text-[0.75rem]">
                        <span className="text-foreground">{g.name}{g.owner ? " · propriétaire" : ""} · {g.members} membres</span>
                        <span className="font-bold text-foreground">{money(g.collected, g.currency)}</span>
                      </div>
                    ))}
                    {detail.groups.length === 0 && <p className="text-[0.7rem] text-muted-foreground">Aucun groupe.</p>}
                  </div>
                </section>
                <section>
                  <p className="mb-1.5 text-[0.7rem] font-bold text-muted-foreground">Opérations ({detail.transactions.length})</p>
                  <div className="max-h-72 space-y-1.5 overflow-y-auto">
                    {detail.transactions.map((t, i) => {
                      const credit = ["deposit", "transfer_in", "group_withdraw"].includes(t.type);
                      return (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                          <div className="leading-tight">
                            <p className="text-[0.72rem] font-semibold text-foreground">{TYPE[t.type] ?? t.type} · {t.label}</p>
                            <p className="text-[0.6rem] text-muted-foreground">{new Date(t.created_at).toLocaleString("fr-FR")} · {t.account}{Number(t.fee) > 0 ? ` · frais ${money(t.fee, t.currency)}` : ""}</p>
                          </div>
                          <span className={`text-[0.75rem] font-bold ${credit ? "text-brand-green" : "text-brand-red"}`}>
                            {credit ? "+" : "−"}{money(t.amount, t.currency)}
                          </span>
                        </div>
                      );
                    })}
                    {detail.transactions.length === 0 && <p className="text-[0.7rem] text-muted-foreground">Aucune opération.</p>}
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </Modal>
    </main>
  );
}
