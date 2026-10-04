import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Banknote, Layers, ShieldCheck, Users } from "lucide-react";
import { Coffre } from "@/components/filax/coffre";
import { PageTitle } from "@/components/filax/ui-kit";
import {
  adminDecideKyc,
  adminDecideWithdrawal,
  adminListKyc,
  adminListWithdrawals,
  kycFileUrl,
  useDbUser,
  useIsAdmin,
} from "@/lib/filax-db";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Back-office FILAX — KYC et retraits" },
      { name: "description", content: "Validation des vérifications d'identité et des retraits de groupe FILAX." },
      { property: "og:title", content: "Back-office FILAX" },
      { property: "og:description", content: "Validation des KYC et des retraits de groupe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Kyc = Awaited<ReturnType<typeof adminListKyc>>[number];
type Wd = Awaited<ReturnType<typeof adminListWithdrawals>>[number];

const STATUS: Record<string, string> = {
  pending: "En attente",
  verified: "Validé",
  approved: "Validé",
  rejected: "Refusé",
};

function DecisionButtons({ onDecide }: { onDecide: (ok: boolean) => void }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <button type="button" onClick={() => onDecide(true)} className="press rounded-xl bg-brand-green py-2 text-[0.72rem] font-bold text-white">
        Valider
      </button>
      <button type="button" onClick={() => onDecide(false)} className="press rounded-xl border border-border py-2 text-[0.72rem] font-bold text-brand-red">
        Refuser
      </button>
    </div>
  );
}

function KycRow({ k, onDone }: { k: Kyc; onDone: () => void }) {
  const [urls, setUrls] = useState<{ doc: string | null; selfie: string | null }>({ doc: null, selfie: null });
  const [filesReady, setFilesReady] = useState(false);
  useEffect(() => {
    setFilesReady(false);
    void Promise.all([kycFileUrl(k.id_document_path), kycFileUrl(k.selfie_path)]).then(([doc, selfie]) => {
      setUrls({ doc, selfie });
      setFilesReady(true);
    }).catch(() => setFilesReady(true));
  }, [k.id_document_path, k.selfie_path]);
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <div className="flex items-center justify-between">
        <div className="leading-tight">
          <p className="text-[0.8rem] font-bold text-foreground">{`${k.first_name ?? ""} ${k.last_name ?? ""}`.trim() || k.email}</p>
          <p className="text-[0.62rem] text-muted-foreground">{k.filax_id ?? "—"} · {k.id_document_type?.toUpperCase()}</p>
        </div>
        <span className="text-[0.65rem] font-bold text-muted-foreground">{STATUS[k.kyc_status] ?? k.kyc_status}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[["Pièce d'identité", urls.doc], ["Selfie", urls.selfie]].map(([label, url]) => (
          <a key={label} href={url ?? undefined} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-muted">
            {url ? <img src={url} alt={label ?? ""} className="h-24 w-full object-cover" /> : <div className="flex h-24 items-center justify-center px-2 text-center text-[0.62rem] text-muted-foreground">{filesReady ? "Fichier absent ou inaccessible" : "Chargement du fichier…"}</div>}
            <p className="px-2 py-1 text-[0.6rem] text-muted-foreground">{label}</p>
          </a>
        ))}
      </div>
      {k.kyc_status === "pending" && (
        <DecisionButtons
          onDecide={async (ok) => {
            try {
              await adminDecideKyc(k.user_id, ok);
              toast.success(ok ? "Identité validée" : "Dossier refusé");
              onDone();
            } catch (e) {
              toast.error("Action impossible", { description: (e as Error).message });
            }
          }}
        />
      )}
    </div>
  );
}

function AdminPage() {
  const userId = useDbUser();
  const isAdmin = useIsAdmin(userId);
  const [kyc, setKyc] = useState<Kyc[]>([]);
  const [wds, setWds] = useState<Wd[]>([]);
  const load = useCallback(async () => {
    try {
      const [k, w] = await Promise.all([adminListKyc(), adminListWithdrawals()]);
      setKyc(k);
      setWds(w);
    } catch (e) {
      toast.error("Chargement impossible", { description: (e as Error).message });
    }
  }, []);
  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-16 pt-6">
      <Link to="/profil" className="press flex items-center gap-1 text-[0.75rem] font-semibold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <PageTitle title="Back-office" subtitle="Validation des identités et des retraits de groupe." />
      {isAdmin === null ? (
        <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Chargement…</p>
      ) : !isAdmin ? (
        <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">Accès réservé aux administrateurs FILAX.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <Link to="/admin/clients" className="press flex items-center justify-between rounded-2xl bg-surface px-4 py-3 soft-shadow">
            <span className="flex items-center gap-2 text-[0.8rem] font-bold text-foreground"><Users className="h-4 w-4" /> Clients</span>
            <span className="text-[0.7rem] text-muted-foreground">Comptes, groupes, opérations</span>
          </Link>
          <Link to="/admin/groupes" className="press flex items-center justify-between rounded-2xl bg-surface px-4 py-3 soft-shadow">
            <span className="flex items-center gap-2 text-[0.8rem] font-bold text-foreground"><Layers className="h-4 w-4" /> Groupes</span>
            <span className="text-[0.7rem] text-muted-foreground">Créer, modifier, supprimer</span>
          </Link>
          <Coffre
            title="Demandes KYC"
            subtitle="Pièce d'identité et selfie"
            icon={<ShieldCheck className="h-4 w-4" />}
            badge={`${kyc.filter((k) => k.kyc_status === "pending").length}`}
          >
            <div className="space-y-2">
              {kyc.map((k) => <KycRow key={k.user_id} k={k} onDone={load} />)}
              {kyc.length === 0 && <p className="text-[0.72rem] text-muted-foreground">Aucune demande.</p>}
            </div>
          </Coffre>
          <Coffre
            title="Retraits de groupe"
            subtitle="Versement depuis la cagnotte"
            icon={<Banknote className="h-4 w-4" />}
            badge={`${wds.filter((w) => w.status === "pending").length}`}
          >
            <div className="space-y-2">
              {wds.map((w) => (
                <div key={w.id} className="rounded-2xl bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="leading-tight">
                      <p className="text-[0.8rem] font-bold text-foreground">{w.amount} {w.currency} · {w.group_name}</p>
                      <p className="text-[0.62rem] text-muted-foreground">
                        {w.requester || "Membre"} · cagnotte {w.collected} {w.currency}{w.reason ? ` · ${w.reason}` : ""}
                      </p>
                    </div>
                    <span className="text-[0.65rem] font-bold text-muted-foreground">{STATUS[w.status] ?? w.status}</span>
                  </div>
                  {w.status === "pending" && (
                    <DecisionButtons
                      onDecide={async (ok) => {
                        try {
                          await adminDecideWithdrawal(w.id, ok);
                          toast.success(ok ? "Retrait validé" : "Retrait refusé");
                          void load();
                        } catch (e) {
                          toast.error("Action impossible", { description: (e as Error).message });
                        }
                      }}
                    />
                  )}
                </div>
              ))}
              {wds.length === 0 && <p className="text-[0.72rem] text-muted-foreground">Aucune demande.</p>}
            </div>
          </Coffre>
        </div>
      )}
    </main>
  );
}
