import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { Field, PageTitle, PrimaryButton, TextInput } from "@/components/filax/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/filax-store";
import { useDbUser, useIsAdmin } from "@/lib/filax-db";

export const Route = createFileRoute("/admin_/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Back-office FILAX" },
      { name: "description", content: "Envoyer et gérer les notifications des clients FILAX." },
      { property: "og:title", content: "Notifications — Back-office FILAX" },
      { property: "og:description", content: "Envoi ciblé ou à tous les clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminNotifications,
});

type N = { id: string; recipient: string | null; title: string; body: string | null; read: boolean; created_at: string };

function AdminNotifications() {
  const userId = useDbUser();
  const isAdmin = useIsAdmin(userId);
  const [list, setList] = useState<N[]>([]);
  const [to, setTo] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_notifications");
    if (error) return toast.error("Chargement impossible", { description: error.message });
    setList((data ?? []) as N[]);
  }, []);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const send = async () => {
    if (title.trim().length < 2) return toast.error("Ajoutez un titre.");
    setBusy(true);
    let target: string | null = null;
    if (to.trim()) {
      const { data } = await supabase.rpc("admin_list_clients");
      const id = to.trim().toUpperCase();
      target = data?.find((c) => c.filax_id?.toUpperCase() === id || c.email?.toLowerCase() === to.trim().toLowerCase())?.user_id ?? null;
      if (!target) {
        setBusy(false);
        return toast.error("Client introuvable");
      }
    }
    const { data: n, error } = await supabase.rpc("admin_send_notification", { _user: target as string, _title: title, _body: body });
    setBusy(false);
    if (error) return toast.error("Envoi impossible", { description: error.message });
    toast.success(`Notification envoyée à ${n} client${(n ?? 0) > 1 ? "s" : ""}`);
    setTitle("");
    setBody("");
    void load();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-16 pt-6">
      <BackButton fallbackTo="/admin" />
      <PageTitle title="Notifications" subtitle="Envoyer et gérer" />
      {!isAdmin ? (
        <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Accès réservé aux administrateurs FILAX.</p>
      ) : (
        <>
          <section className="mt-4 space-y-2.5 rounded-3xl bg-surface p-4 soft-shadow">
            <Field label="Destinataire (ID FILAX ou e-mail, vide = tous les clients)">
              <TextInput value={to} maxLength={120} onChange={(e) => setTo(e.target.value)} placeholder="FLX-… ou vide" />
            </Field>
            <Field label="Titre"><TextInput value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Message">
              <textarea value={body} maxLength={500} onChange={(e) => setBody(e.target.value)} rows={3} className="w-full rounded-2xl border border-border bg-transparent px-3.5 py-2.5 text-[0.8rem] text-foreground outline-none" />
            </Field>
            <PrimaryButton onClick={send} disabled={busy}>{busy ? "Envoi…" : "Envoyer"}</PrimaryButton>
          </section>
          <div className="mt-3 space-y-2">
            {list.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-2 rounded-2xl bg-surface px-3.5 py-3 soft-shadow">
                <div className="min-w-0 leading-tight">
                  <p className="text-[0.78rem] font-bold text-foreground">{n.title}</p>
                  <p className="text-[0.66rem] text-muted-foreground">{n.body}</p>
                  <p className="mt-0.5 text-[0.58rem] text-muted-foreground">{n.recipient ?? "—"} · {formatDate(new Date(n.created_at).getTime())} · {n.read ? "Lue" : "Non lue"}</p>
                </div>
                <button
                  type="button"
                  aria-label="Supprimer"
                  onClick={async () => {
                    const { error } = await supabase.rpc("admin_delete_notification", { _id: n.id });
                    if (error) return toast.error("Suppression impossible");
                    void load();
                  }}
                  className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border text-brand-red"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
