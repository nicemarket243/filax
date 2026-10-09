import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, CheckCircle2, Clock, FileText, ShieldCheck, XCircle } from "lucide-react";
import { AppHeader, BottomNav } from "@/components/filax/shell";
import { BackButton } from "@/components/back-button";
import { Field, PageTitle, PrimaryButton, accentVar } from "@/components/filax/ui-kit";
import { submitDbKyc, useDbProfile, useDbUser } from "@/lib/filax-db";

export const Route = createFileRoute("/verification")({
  head: () => ({
    meta: [
      { title: "Vérification d'identité — FILAX" },
      { name: "description", content: "Vérifiez votre identité FILAX avec une pièce officielle et un selfie." },
      { property: "og:title", content: "Vérification d'identité — FILAX" },
      { property: "og:description", content: "Pièce d'identité, selfie et validation par l'équipe FILAX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerificationPage,
});

const STEPS = [
  { icon: FileText, title: "Pièce d'identité", text: "Carte d'identité, passeport ou permis, lisible et en cours de validité." },
  { icon: Camera, title: "Selfie de contrôle", text: "Une photo de votre visage, bien éclairée, sans lunettes de soleil." },
  { icon: ShieldCheck, title: "Validation FILAX", text: "Notre équipe compare les deux photos et vous notifie du résultat." },
];

const fileCls =
  "w-full rounded-2xl border border-border bg-transparent px-3.5 py-2.5 text-[0.72rem] text-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-brand-blue/15 file:px-3 file:py-1.5 file:text-[0.7rem] file:font-bold file:text-brand-blue";

function VerificationPage() {
  const userId = useDbUser();
  const { profile, refresh } = useDbProfile(userId);
  const status = profile?.kycStatus ?? "not_started";
  const [docType, setDocType] = useState("cni");
  const [doc, setDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!userId) return;
    if (!doc || !selfie) return toast.error("Ajoutez la photo de la pièce et le selfie.");
    if (doc.size > 8e6 || selfie.size > 8e6) return toast.error("Chaque photo doit faire moins de 8 Mo.");
    setBusy(true);
    try {
      await submitDbKyc(userId, docType, doc, selfie);
      toast.success("Documents envoyés", { description: "Vous serez notifié dès la validation." });
      await refresh();
    } catch (e) {
      toast.error("Envoi impossible", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const state =
    status === "verified"
      ? { icon: CheckCircle2, color: "brand-green" as const, title: "Identité vérifiée", text: "Toutes les fonctions FILAX sont débloquées." }
      : status === "pending"
        ? { icon: Clock, color: "brand-blue" as const, title: "Vérification en cours", text: "Vos documents sont en cours d'examen par l'équipe FILAX." }
        : status === "rejected"
          ? { icon: XCircle, color: "brand-red" as const, title: "Vérification refusée", text: "Renvoyez des photos nettes et lisibles." }
          : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />
      <BackButton fallbackTo="/profil" />
      <PageTitle title="Vérification d'identité" subtitle="Trois étapes, environ deux minutes." />

      {state && (
        <div className="mt-4 flex items-center gap-3 rounded-3xl bg-surface p-4 soft-shadow">
          <state.icon className="h-8 w-8 shrink-0" style={{ color: accentVar(state.color) }} />
          <div className="leading-tight">
            <p className="text-[0.9rem] font-extrabold text-foreground">{state.title}</p>
            <p className="text-[0.7rem] text-muted-foreground">{state.text}</p>
          </div>
        </div>
      )}

      <ol className="mt-4 space-y-2.5">
        {STEPS.map((s, i) => {
          const done = status === "verified" || (status === "pending" && i < 2);
          return (
            <li key={s.title} className="flex gap-3 rounded-2xl bg-surface p-3.5 soft-shadow">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `color-mix(in oklab, ${accentVar(done ? "brand-green" : "brand-blue")} 14%, transparent)`, color: accentVar(done ? "brand-green" : "brand-blue") }}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </span>
              <div className="leading-tight">
                <p className="text-[0.8rem] font-bold text-foreground">{i + 1}. {s.title}</p>
                <p className="text-[0.66rem] text-muted-foreground">{s.text}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {!userId ? (
        <Link to="/" className="mt-5 text-center text-[0.75rem] font-bold text-brand-blue">Connectez-vous pour vérifier votre identité</Link>
      ) : (status === "not_started" || status === "rejected") && (
        <div className="mt-5 space-y-3 rounded-3xl bg-surface p-4 soft-shadow">
          <Field label="Type de pièce">
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full rounded-2xl border border-border bg-transparent px-3.5 py-3 text-[0.8rem] font-semibold text-foreground outline-none">
              <option value="cni">Carte d'identité</option>
              <option value="passeport">Passeport</option>
              <option value="permis">Permis de conduire</option>
            </select>
          </Field>
          <Field label="Photo de la pièce">
            <input type="file" accept="image/*" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} className={fileCls} />
          </Field>
          <Field label="Selfie de contrôle">
            <input type="file" accept="image/*" capture="user" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} className={fileCls} />
          </Field>
          <PrimaryButton color="brand-green" onClick={submit} disabled={busy}>
            {busy ? "Envoi en cours…" : "Envoyer mes documents"}
          </PrimaryButton>
          <p className="text-center text-[0.6rem] text-muted-foreground">Vos documents sont chiffrés et visibles uniquement par l'équipe de vérification.</p>
        </div>
      )}
      <BottomNav />
    </main>
  );
}
