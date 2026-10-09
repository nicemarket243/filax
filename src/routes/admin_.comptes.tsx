import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/components/back-button";
import { PageTitle, TextInput } from "@/components/filax/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useDbUser, useIsAdmin } from "@/lib/filax-db";
import { formatMoney, type Currency } from "@/lib/filax-store";

export const Route = createFileRoute("/admin_/comptes")({
  head: () => ({
    meta: [
      { title: "Comptes FILAX — Back-office" },
      { name: "description", content: "Liste et statut de tous les comptes FILAX." },
      { property: "og:title", content: "Comptes FILAX — Back-office" },
      { property: "og:description", content: "Activer ou bloquer les comptes clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAccounts,
});

type Row = { id: string; user_id: string; owner: string | null; filax_id: string | null; name: string; kind: string; currency: string; balance: number; status: string };

function AdminAccounts() {
  const userId = useDbUser();
  const isAdmin = useIsAdmin(userId);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_accounts");
    if (error) return toast.error("Chargement impossible", { description: error.message });
    setRows((data ?? []) as Row[]);
  }, []);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);
  const list = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) => !s || [r.owner, r.filax_id, r.name].some((v) => v?.toLowerCase().includes(s)));
  }, [rows, q]);

  const toggle = async (r: Row) => {
    const next = r.status === "active" ? "blocked" : "active";
    const { error } = await supabase.rpc("admin_set_account_status", { _account: r.id, _status: next });
    if (error) return toast.error("Action impossible", { description: error.message });
    toast.success(next === "active" ? "Compte activé" : "Compte bloqué");
    void load();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-16 pt-6">
      <BackButton fallbackTo="/admin" />
      <PageTitle title="Comptes FILAX" subtitle={`${rows.length} comptes`} />
      {!isAdmin ? (
        <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Accès réservé aux administrateurs FILAX.</p>
      ) : (
        <>
          <div className="mt-4"><TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un client, un ID FILAX, un compte" /></div>
          <div className="mt-3 space-y-2">
            {list.map((r) => {
              const mine = r.user_id === userId;
              return (
                <div key={r.id} className="flex items-center justify-between rounded-2xl bg-surface px-3.5 py-3 soft-shadow">
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[0.8rem] font-bold text-foreground">{r.name}</p>
                    <p className="truncate text-[0.62rem] text-muted-foreground">{r.owner ?? "—"} · {r.filax_id} · {formatMoney(Number(r.balance), r.currency as Currency)}</p>
                  </div>
                  {mine ? (
                    <span className="text-[0.62rem] font-bold text-muted-foreground">Protégé</span>
                  ) : (
                    <button type="button" onClick={() => void toggle(r)} className={`press rounded-xl px-3 py-1.5 text-[0.68rem] font-bold ${r.status === "active" ? "border border-border text-brand-red" : "bg-brand-green text-white"}`}>
                      {r.status === "active" ? "Bloquer" : "Activer"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
