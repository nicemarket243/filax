import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { PageTitle } from "@/components/filax/ui-kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { EXPENSE_CATEGORIES, expensesToCsv, totalsByCurrency } from "@/lib/expenses";

export const Route = createFileRoute("/depenses")({
  head: () => ({
    meta: [
      { title: "Factures et reçus — FILAX" },
      { name: "description", content: "Importez vos factures et reçus, lus et classés automatiquement, puis exportez vos dépenses." },
      { property: "og:title", content: "Tableau de dépenses FILAX" },
      { property: "og:description", content: "Factures et reçus lus par l'IA, classés par catégorie et exportables." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DepensesPage,
});

type Expense = {
  id: string;
  vendor: string;
  expense_date: string | null;
  amount: number;
  currency: string;
  category: string;
  doc_type: string;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
};

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

function DepensesPage() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("Toutes");
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Impossible de charger vos dépenses.");
    setRows((data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })) as Expense[]);
    setLoading(false);
  }, []);
  useEffect(() => void load(), [load]);

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    const { data: s } = await supabase.auth.getSession();
    const session = s.session;
    if (!session) return toast.error("Connectez-vous pour importer vos documents.");
    for (const file of Array.from(files)) {
      setBusy(file.name);
      try {
        if (file.size > 8 * 1024 * 1024) throw new Error("Fichier trop lourd (8 Mo maximum).");
        const res = await fetch("/api/public/receipt-scan", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type, base64: await toBase64(file) }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Lecture impossible.");
        const path = `${session.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type });
        const { error } = await supabase.from("expenses").insert({
          user_id: session.user.id,
          vendor: body.vendor,
          expense_date: body.expense_date,
          amount: body.amount,
          currency: body.currency,
          category: body.category,
          doc_type: body.doc_type,
          description: body.description,
          file_path: up.error ? null : path,
          file_name: file.name,
        });
        if (error) throw new Error("Enregistrement impossible.");
        toast.success(`${file.name} : ${body.category}, ${body.amount} ${body.currency}`);
      } catch (e) {
        toast.error(`${file.name} : ${e instanceof Error ? e.message : "erreur"}`);
      }
    }
    setBusy(null);
    if (input.current) input.current.value = "";
    load();
  }

  async function update(id: string, patch: Partial<Expense>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("expenses").update(patch).eq("id", id);
    if (error) toast.error("Modification non enregistrée.");
  }

  async function remove(e: Expense) {
    if (!confirm(`Supprimer ${e.vendor || e.file_name} ?`)) return;
    if (e.file_path) await supabase.storage.from("receipts").remove([e.file_path]);
    await supabase.from("expenses").delete().eq("id", e.id);
    load();
  }

  async function openFile(path: string) {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 120);
    if (data) window.open(data.signedUrl, "_blank", "noopener");
  }

  const shown = filter === "Toutes" ? rows : rows.filter((r) => r.category === filter);
  const totals = totalsByCurrency(shown);

  function exportCsv() {
    const blob = new Blob([expensesToCsv(shown)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `filax-depenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />
      <PageTitle title="Factures et reçus" subtitle="Lus et classés automatiquement" />

      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(e) => importFiles(e.target.files)} />
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button className="magnetide-tap" disabled={!!busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Lecture…" : "Importer"}
        </Button>
        <Button variant="outline" disabled={!shown.length} onClick={exportCsv}>
          <Download className="h-4 w-4" /> Exporter
        </Button>
      </div>
      {busy && <p className="mt-2 truncate text-center text-xs text-muted-foreground">Lecture de {busy}…</p>}

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {["Toutes", ...EXPENSE_CATEGORIES].map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`press shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${filter === c ? "border-brand-blue bg-accent text-brand-blue" : "border-border text-muted-foreground"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-surface/70 p-3 text-sm">
        <span className="text-muted-foreground">Total : </span>
        <span className="font-bold">
          {Object.keys(totals).length ? Object.entries(totals).map(([c, v]) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${c}`).join(" · ") : "0,00"}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {loading && <p className="text-center text-sm text-muted-foreground">Chargement…</p>}
        {!loading && !shown.length && <p className="py-8 text-center text-sm text-muted-foreground">Aucune dépense. Importez une photo ou un PDF de facture.</p>}
        {shown.map((e) => (
          <div key={e.id} className="rounded-2xl border border-border bg-surface/70 p-3">
            <div className="flex items-start gap-2">
              <input aria-label="Fournisseur" className="min-w-0 flex-1 bg-transparent font-semibold outline-none" defaultValue={e.vendor} onBlur={(ev) => ev.target.value !== e.vendor && update(e.id, { vendor: ev.target.value })} />
              <span className="whitespace-nowrap font-bold">{e.amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} {e.currency}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <select aria-label="Catégorie" className="rounded-full border border-border bg-background px-2 py-1" value={e.category} onChange={(ev) => update(e.id, { category: ev.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <span className="capitalize">{e.doc_type}</span>
              <span>{e.expense_date ?? "date inconnue"}</span>
              <span className="ml-auto flex gap-1">
                {e.file_path && (
                  <button aria-label="Voir le document" className="press rounded-full p-1.5 hover:bg-accent" onClick={() => openFile(e.file_path!)}><FileText className="h-4 w-4" /></button>
                )}
                <button aria-label="Supprimer" className="press rounded-full p-1.5 hover:bg-accent" onClick={() => remove(e)}><Trash2 className="h-4 w-4" /></button>
              </span>
            </div>
            {e.description && <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>}
          </div>
        ))}
      </div>
      <BottomNav />
    </main>
  );
}
