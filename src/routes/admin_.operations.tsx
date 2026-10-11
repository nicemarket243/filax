import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/components/back-button";
import { PageTitle, TextInput } from "@/components/filax/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useDbUser, useIsAdmin } from "@/lib/filax-db";
import { formatMoney, type Currency } from "@/lib/filax-store";

export const Route = createFileRoute("/admin_/operations")({
  head: () => ({
    meta: [
      { title: "Opérations & audit — Back-office FILAX" },
      { name: "description", content: "Dépôts en attente, remboursements, litiges, incidents, journal d'audit et rapprochement." },
      { property: "og:title", content: "Opérations & audit — Back-office FILAX" },
      { property: "og:description", content: "Supervision du moteur financier FILAX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOperations,
});

type Tab = "pending" | "ops" | "disputes" | "incidents" | "audit" | "recon";
const TABS: [Tab, string][] = [
  ["pending", "En attente"], ["ops", "Opérations"], ["disputes", "Litiges"],
  ["incidents", "Incidents"], ["audit", "Audit"], ["recon", "Rapprochement"],
];
const STATUS: Record<string, string> = { created: "Créée", pending: "En attente", confirmed: "Confirmée", failed: "Échouée", refunded: "Remboursée", open: "Ouvert", resolved: "Résolu", rejected: "Refusé" };

type Tx = { id: string; owner: string | null; filax_id: string | null; account: string; currency: string; type: string; amount: number; fee: number; label: string | null; status: string; failure_reason: string | null; created_at: string };
type Dispute = { id: string; owner: string | null; filax_id: string | null; tx_label: string | null; tx_amount: number | null; reason: string; status: string; resolution: string | null; created_at: string };
type Incident = { id: string; title: string; severity: string; status: string; details: string | null; created_at: string };
type Audit = { id: string; action: string; target: string | null; details: unknown; created_at: string };
type Recon = { currency: string; total_balance: number; ledger_net: number; gap: number; pending_count: number; pending_amount: number; fees: number };

const card = "rounded-2xl bg-surface p-3.5 soft-shadow";
const btn = "press rounded-xl px-3 py-1.5 text-[0.68rem] font-bold";
const date = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

function AdminOperations() {
  const userId = useDbUser();
  const isAdmin = useIsAdmin(userId);
  const [tab, setTab] = useState<Tab>("pending");
  const [txs, setTxs] = useState<Tx[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [recon, setRecon] = useState<Recon[]>([]);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const fail = (e: { message: string } | null) => e && toast.error("Chargement impossible", { description: e.message });
    if (tab === "pending" || tab === "ops") {
      const { data, error } = await supabase.rpc("admin_list_transactions", tab === "pending" ? { _status: "pending" } : {});
      fail(error); setTxs((data ?? []) as Tx[]);
    } else if (tab === "disputes") {
      const { data, error } = await supabase.rpc("admin_list_disputes"); fail(error); setDisputes((data ?? []) as Dispute[]);
    } else if (tab === "incidents") {
      const { data, error } = await supabase.from("incidents").select("*").order("created_at", { ascending: false }); fail(error); setIncidents((data ?? []) as Incident[]);
    } else if (tab === "audit") {
      const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200); fail(error); setAudit((data ?? []) as Audit[]);
    } else {
      const { data, error } = await supabase.rpc("admin_reconciliation"); fail(error); setRecon((data ?? []) as Recon[]);
    }
  }, [tab]);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  const act = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await fn();
      if (error) toast.error("Action impossible", { description: error.message });
      else { toast.success(ok); await load(); }
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-16 pt-6">
      <BackButton fallbackTo="/admin" />
      <PageTitle title="Opérations & audit" subtitle="Moteur financier, litiges et rapprochement" />
      {!isAdmin ? (
        <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Accès réservé aux administrateurs FILAX.</p>
      ) : (
        <>
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
            {TABS.map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`${btn} shrink-0 ${tab === k ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>{l}</button>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {(tab === "pending" || tab === "ops") && (txs.length === 0 ? <Empty /> : txs.map((t) => (
              <div key={t.id} className={card}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[0.8rem] font-bold text-foreground">{formatMoney(Number(t.amount), t.currency as Currency)} · {t.label ?? t.type}</p>
                    <p className="truncate text-[0.62rem] text-muted-foreground">{t.owner ?? "—"} · {t.filax_id} · {t.account} · {date(t.created_at)}</p>
                    {t.failure_reason && <p className="text-[0.62rem] text-brand-red">{t.failure_reason}</p>}
                  </div>
                  <span className="shrink-0 text-[0.62rem] font-bold text-muted-foreground">{STATUS[t.status] ?? t.status}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  {t.status === "pending" && t.type === "deposit" && (
                    <button type="button" disabled={busy} className={`${btn} bg-brand-green text-white`} onClick={() => act(() => supabase.rpc("admin_confirm_deposit", { _tx: t.id }), "Dépôt confirmé et crédité")}>Paiement reçu</button>
                  )}
                  {(t.status === "pending" || t.status === "created") && (
                    <button type="button" disabled={busy} className={`${btn} border border-border text-brand-red`} onClick={() => act(() => supabase.rpc("admin_fail_transaction", { _tx: t.id, _reason: "Paiement non reçu" }), "Opération marquée échouée")}>Échec</button>
                  )}
                  {t.status === "confirmed" && ["withdraw", "transfer_out", "contribution"].includes(t.type) && (
                    <button type="button" disabled={busy} className={`${btn} border border-border text-foreground`} onClick={() => { if (confirm("Rembourser cette opération (montant + frais) ?")) void act(() => supabase.rpc("admin_refund_transaction", { _tx: t.id, _reason: "Remboursement back-office" }), "Remboursé"); }}>Rembourser</button>
                  )}
                </div>
              </div>
            )))}

            {tab === "disputes" && (disputes.length === 0 ? <Empty /> : disputes.map((d) => (
              <div key={d.id} className={card}>
                <div className="flex justify-between gap-2">
                  <p className="text-[0.78rem] font-bold text-foreground">{d.owner ?? "—"} · {d.filax_id}</p>
                  <span className="text-[0.62rem] font-bold text-muted-foreground">{STATUS[d.status] ?? d.status}</span>
                </div>
                {d.tx_label && <p className="text-[0.65rem] text-muted-foreground">{d.tx_label} · {d.tx_amount}</p>}
                <p className="mt-1 text-[0.72rem] text-foreground">{d.reason}</p>
                {d.resolution && <p className="text-[0.65rem] text-muted-foreground">→ {d.resolution}</p>}
                {d.status === "open" && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy} className={`${btn} bg-brand-green text-white`} onClick={() => act(() => supabase.rpc("admin_resolve_dispute", { _id: d.id, _accepted: true, _resolution: "Réclamation acceptée" }), "Litige résolu")}>Accepter</button>
                    <button type="button" disabled={busy} className={`${btn} border border-border text-brand-red`} onClick={() => act(() => supabase.rpc("admin_resolve_dispute", { _id: d.id, _accepted: false, _resolution: "Réclamation refusée" }), "Litige refusé")}>Refuser</button>
                  </div>
                )}
              </div>
            )))}

            {tab === "incidents" && (
              <>
                <div className={`${card} space-y-2`}>
                  <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'incident" maxLength={120} />
                  <TextInput value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Détails" maxLength={2000} />
                  <div className="flex gap-2">
                    <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                      <option value="low">Faible</option><option value="medium">Moyen</option><option value="high">Élevé</option><option value="critical">Critique</option>
                    </select>
                    <button type="button" disabled={busy || title.trim().length < 3} className={`${btn} bg-foreground text-background disabled:opacity-40`} onClick={() => act(async () => { const r = await supabase.rpc("admin_create_incident", { _title: title, _severity: severity, _details: details }); if (!r.error) { setTitle(""); setDetails(""); } return r; }, "Incident créé")}>Déclarer</button>
                  </div>
                </div>
                {incidents.length === 0 ? <Empty /> : incidents.map((i) => (
                  <div key={i.id} className={card}>
                    <div className="flex justify-between gap-2"><p className="text-[0.78rem] font-bold text-foreground">{i.title}</p><span className="text-[0.62rem] font-bold text-muted-foreground">{i.severity} · {STATUS[i.status]}</span></div>
                    {i.details && <p className="text-[0.68rem] text-muted-foreground">{i.details}</p>}
                    {i.status === "open" && <button type="button" disabled={busy} className={`${btn} mt-2 border border-border text-foreground`} onClick={() => act(() => supabase.rpc("admin_resolve_incident", { _id: i.id }), "Incident clôturé")}>Clôturer</button>}
                  </div>
                ))}
              </>
            )}

            {tab === "audit" && (audit.length === 0 ? <Empty /> : audit.map((a) => (
              <div key={a.id} className={card}>
                <p className="text-[0.75rem] font-bold text-foreground">{a.action}</p>
                <p className="truncate text-[0.62rem] text-muted-foreground">{date(a.created_at)} · {a.target} · {JSON.stringify(a.details)}</p>
              </div>
            )))}

            {tab === "recon" && (recon.length === 0 ? <Empty /> : recon.map((r) => (
              <div key={r.currency} className={card}>
                <p className="text-[0.8rem] font-bold text-foreground">{r.currency}</p>
                <dl className="mt-1 grid grid-cols-2 gap-1 text-[0.68rem]">
                  <dt className="text-muted-foreground">Total des soldes</dt><dd className="text-right font-semibold text-foreground">{formatMoney(Number(r.total_balance), r.currency as Currency)}</dd>
                  <dt className="text-muted-foreground">Net du journal</dt><dd className="text-right font-semibold text-foreground">{formatMoney(Number(r.ledger_net), r.currency as Currency)}</dd>
                  <dt className="text-muted-foreground">Écart</dt><dd className={`text-right font-bold ${Number(r.gap) === 0 ? "text-brand-green" : "text-brand-red"}`}>{formatMoney(Number(r.gap), r.currency as Currency)}</dd>
                  <dt className="text-muted-foreground">En attente</dt><dd className="text-right font-semibold text-foreground">{r.pending_count} · {formatMoney(Number(r.pending_amount), r.currency as Currency)}</dd>
                  <dt className="text-muted-foreground">Frais FILAX</dt><dd className="text-right font-semibold text-foreground">{formatMoney(Number(r.fees), r.currency as Currency)}</dd>
                </dl>
                {Number(r.gap) !== 0 && <p className="mt-1 text-[0.62rem] text-muted-foreground">Un écart peut venir des soldes de démonstration saisis sans opération.</p>}
              </div>
            )))}
          </div>
        </>
      )}
    </main>
  );
}

function Empty() {
  return <p className="py-6 text-center text-[0.72rem] text-muted-foreground">Rien à afficher.</p>;
}
