import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, Copy, Lock, QrCode, Share2, ShieldAlert, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { Coffre } from "@/components/filax/coffre";
import {
  BankBadge,
  Field,
  Modal,
  PageTitle,
  PrimaryButton,
  TextInput,
  ThemeToggle,
  accentVar,
} from "@/components/filax/ui-kit";
import { InviteModal } from "@/components/filax/action-modals";
import { ReceiveQrModal } from "@/components/filax/qr-scanner";
import { formatDate, useFilax } from "@/lib/filax-store";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil FILAX" },
      { name: "description", content: "Votre identité FILAX, votre ID de réception, votre sécurité et vos préférences." },
      { property: "og:title", content: "Mon profil FILAX" },
      { property: "og:description", content: "Gérez votre identité, votre vérification, votre sécurité et votre ID FILAX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const filax = useFilax();
  const { profile } = filax.data;
  const [modal, setModal] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email ?? "");
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");
  const [pin, setPin] = useState("");
  const [kycStep, setKycStep] = useState(0);

  const verified = !!profile.verified;

  const share = async () => {
    const text = `Envoyez-moi de l'argent sur FILAX : ${profile.filaxId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mon ID FILAX", text });
        return;
      } catch {
        /* partage annulé */
      }
    }
    await navigator.clipboard?.writeText(text);
    toast.success("Lien de partage copié");
  };

  const runKyc = () => {
    // Vérification en 3 étapes : pièce d'identité, selfie, validation.
    setKycStep(1);
    setTimeout(() => setKycStep(2), 900);
    setTimeout(() => {
      filax.updateProfile({ verified: true, verifiedAt: Date.now() });
      setKycStep(3);
      toast.success("Identité vérifiée");
    }, 2000);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />

      <PageTitle title="Mon profil" subtitle="Identité, sécurité et préférences." />

      {/* Bloc identité compact */}
      <section className="mt-5 flex items-center gap-3 rounded-3xl border border-border bg-surface p-3.5 soft-shadow">
        <img src={profile.photo ?? ""} alt={profile.firstName} className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-blue/25" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[0.95rem] font-extrabold tracking-tight text-foreground">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="truncate text-[0.68rem] text-muted-foreground">{profile.filaxId}</p>
          <span
            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.58rem] font-bold"
            style={{
              backgroundColor: `color-mix(in oklab, ${accentVar(verified ? "brand-green" : "brand-gold")} 14%, transparent)`,
              color: accentVar(verified ? "brand-green" : "brand-gold"),
            }}
          >
            {verified ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
            {verified ? "Identité vérifiée" : "Identité non vérifiée"}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            aria-label="Copier l'ID FILAX"
            onClick={() => {
              navigator.clipboard?.writeText(profile.filaxId);
              toast.success("ID copié");
            }}
            className="press flex h-8 w-8 items-center justify-center rounded-xl border border-border text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Partager mon ID"
            onClick={share}
            className="press flex h-8 w-8 items-center justify-center rounded-xl border border-border text-foreground"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* Deux QR distincts : profil (identité) et réception (transaction). */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setModal("qr-profil")}
          className="press flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-2.5 text-[0.72rem] font-bold text-foreground soft-shadow"
        >
          <User className="h-4 w-4 text-brand-blue" /> QR profil
        </button>
        <button
          type="button"
          onClick={() => setModal("qr-recevoir")}
          className="press flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-2.5 text-[0.72rem] font-bold text-foreground soft-shadow"
        >
          <QrCode className="h-4 w-4 text-brand-green" /> QR de réception
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {/* Informations personnelles dans un tiroir */}
        <Coffre title="Informations personnelles" subtitle="Nom, contact, naissance" icon={<User className="h-4 w-4" />}>
          <div className="space-y-3">
            <Field label="Prénom">
              <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="Nom">
              <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
            <Field label="Téléphone">
              <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="E-mail">
              <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Date de naissance">
              <TextInput type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </Field>
            <PrimaryButton
              onClick={() => {
                if (!firstName.trim() || !lastName.trim()) {
                  toast.error("Le nom et le prénom sont obligatoires");
                  return;
                }
                filax.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone, email, birthDate });
                toast.success("Informations mises à jour");
              }}
            >
              Enregistrer
            </PrimaryButton>
          </div>
        </Coffre>

        {/* Vérification d'identité réellement dynamique */}
        <Coffre
          title="Vérification d'identité"
          subtitle={verified ? "Compte vérifié" : "Action requise"}
          icon={<BadgeCheck className="h-4 w-4" />}
          badge={verified ? "OK" : "!"}
        >
          {verified ? (
            <div className="rounded-2xl bg-muted/50 p-3 text-[0.72rem] leading-relaxed text-muted-foreground">
              Votre identité a été vérifiée{profile.verifiedAt ? ` le ${formatDate(profile.verifiedAt)}` : ""}. Vos plafonds de
              transfert sont débloqués.
              <button
                type="button"
                onClick={() => {
                  filax.updateProfile({ verified: false, verifiedAt: undefined });
                  setKycStep(0);
                  toast("Vérification réinitialisée");
                }}
                className="press mt-2 block text-[0.7rem] font-bold text-brand-red"
              >
                Refaire la vérification
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {["Pièce d'identité", "Selfie de contrôle", "Validation finale"].map((s, i) => (
                <div key={s} className="flex items-center justify-between rounded-2xl bg-muted/50 px-3 py-2 text-[0.72rem]">
                  <span className="font-semibold text-foreground">{s}</span>
                  <span style={{ color: accentVar(kycStep > i ? "brand-green" : "brand-gold") }} className="text-[0.65rem] font-bold">
                    {kycStep > i ? "Validé" : kycStep === i && kycStep > 0 ? "En cours…" : "En attente"}
                  </span>
                </div>
              ))}
              <PrimaryButton color="brand-green" onClick={runKyc} disabled={kycStep > 0 && kycStep < 3}>
                {kycStep > 0 && kycStep < 3 ? "Vérification en cours…" : "Lancer la vérification"}
              </PrimaryButton>
            </div>
          )}
        </Coffre>

        {/* Sécurité */}
        <Coffre title="Sécurité" subtitle="Code secret et double authentification" icon={<Lock className="h-4 w-4" />}>
          <div className="space-y-3">
            <Field label="Code secret à 4 chiffres">
              <TextInput
                inputMode="numeric"
                maxLength={4}
                placeholder={profile.pin ? "••••" : "Non défini"}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </Field>
            <PrimaryButton
              onClick={() => {
                if (pin.length !== 4) {
                  toast.error("Le code doit contenir 4 chiffres");
                  return;
                }
                filax.updateProfile({ pin });
                setPin("");
                toast.success("Code secret enregistré");
              }}
            >
              {profile.pin ? "Modifier le code" : "Définir le code"}
            </PrimaryButton>

            <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-3 py-2.5">
              <div className="leading-tight">
                <p className="text-[0.76rem] font-bold text-foreground">Double authentification</p>
                <p className="text-[0.62rem] text-muted-foreground">Code envoyé au {profile.phone}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!profile.twoFactor}
                onClick={() => {
                  filax.updateProfile({ twoFactor: !profile.twoFactor });
                  toast.success(profile.twoFactor ? "Double authentification désactivée" : "Double authentification activée");
                }}
                className="press relative h-6 w-11 rounded-full transition"
                style={{ backgroundColor: profile.twoFactor ? accentVar("brand-green") : "var(--muted-foreground)" }}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                  style={{ left: profile.twoFactor ? "1.5rem" : "0.125rem" }}
                />
              </button>
            </div>
          </div>
        </Coffre>

        {/* Préférences */}
        <div className="flex items-center justify-between rounded-3xl border border-border bg-surface p-4 soft-shadow">
          <div className="leading-tight">
            <p className="text-[0.8rem] font-bold text-foreground">Apparence</p>
            <p className="text-[0.65rem] text-muted-foreground">Mode clair ou sombre</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="mt-4">
        <BankBadge />
      </div>

      <InviteModal open={modal === "invite"} onOpenChange={(o) => !o && setModal(null)} filaxId={profile.filaxId} />
      <ReceiveQrModal
        open={modal === "qr-profil"}
        onOpenChange={(o) => !o && setModal(null)}
        filaxId={profile.filaxId}
        name={`${profile.firstName} ${profile.lastName}`}
        title="QR de mon profil"
        subtitle="Ce code partage votre identité FILAX (sans montant)."
      />
      <ReceiveQrModal
        open={modal === "qr-recevoir"}
        onOpenChange={(o) => !o && setModal(null)}
        filaxId={profile.filaxId}
        name={`${profile.firstName} ${profile.lastName}`}
        title="QR de réception"
        subtitle="Faites scanner ce code pour recevoir de l'argent."
      />

      <BottomNav />
    </main>
  );
}
