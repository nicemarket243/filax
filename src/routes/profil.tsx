import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { BankBadge, Field, PrimaryButton, SectionTitle, TextInput, ThemeToggle } from "@/components/filax/ui-kit";
import { InviteModal } from "@/components/filax/action-modals";
import { formatMoney, useFilax } from "@/lib/filax-store";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil FILAX" },
      { name: "description", content: "Votre identité FILAX, votre ID de réception, vos préférences et votre banque partenaire." },
      { property: "og:title", content: "Mon profil FILAX" },
      { property: "og:description", content: "Gérez votre identité, votre ID FILAX et vos préférences d'affichage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const filax = useFilax();
  const { profile, accounts } = filax.data;
  const [invite, setInvite] = useState(false);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);

  const totalUsd = accounts.filter((a) => a.currency === "USD").reduce((s, a) => s + a.balance, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader profile={profile} />

      <section className="mt-5 flex flex-col items-center rounded-3xl border border-border bg-surface p-5 soft-shadow">
        <img src={profile.photo ?? ""} alt={profile.firstName} className="h-20 w-20 rounded-full object-cover ring-4 ring-brand-blue/20" />
        <h1 className="mt-3 text-[1.05rem] font-extrabold tracking-tight text-foreground">
          {profile.firstName} {profile.lastName}
        </h1>
        <p className="text-[0.7rem] text-muted-foreground">{profile.country}</p>
        <span className="mt-2 flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-1 text-[0.62rem] font-bold text-brand-green">
          <ShieldCheck className="h-3 w-3" /> Identité vérifiée
        </span>
        <p className="mt-3 text-[0.7rem] text-muted-foreground">Patrimoine total</p>
        <p className="text-[1.3rem] font-extrabold text-foreground">{formatMoney(totalUsd, "USD")}</p>
      </section>

      <section className="mt-5 rounded-3xl border border-border bg-surface p-4 soft-shadow">
        <p className="text-[0.7rem] font-semibold text-muted-foreground">Votre ID FILAX (pour recevoir de l'argent)</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[1rem] font-extrabold tracking-tight text-brand-blue">{profile.filaxId}</span>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Copier l'ID"
              onClick={() => {
                navigator.clipboard?.writeText(profile.filaxId);
                toast.success("ID copié");
              }}
              className="press flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Partager"
              onClick={() => setInvite(true)}
              className="press flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle title="Informations personnelles" />
        <div className="space-y-3 rounded-3xl border border-border bg-surface p-4 soft-shadow">
          <Field label="Prénom">
            <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Nom">
            <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <PrimaryButton
            onClick={() => {
              filax.updateProfile({ firstName, lastName, phone });
              toast.success("Profil mis à jour");
            }}
          >
            Enregistrer
          </PrimaryButton>
        </div>
      </section>

      <section className="mt-6">
        <SectionTitle title="Préférences" />
        <div className="flex items-center justify-between rounded-3xl border border-border bg-surface p-4 soft-shadow">
          <div className="leading-tight">
            <p className="text-[0.8rem] font-bold text-foreground">Apparence</p>
            <p className="text-[0.65rem] text-muted-foreground">Mode clair ou sombre</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <div className="mt-6">
        <BankBadge />
      </div>

      <InviteModal open={invite} onOpenChange={setInvite} filaxId={profile.filaxId} />

      <BottomNav />
    </main>
  );
}
