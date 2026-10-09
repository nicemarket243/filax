import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Copy, MessageCircle, MessageSquare, Landmark, Languages, Lock, LogOut, Moon, QrCode, Share2, ShieldAlert, ShieldCheck, User } from "lucide-react";
import avatarImg from "@/assets/profile-avatar.jpg";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
import { useI18n } from "@/lib/i18n";
import {
  saveDbProfile,
  setDbPin,
  setDbTwoFactor,
  setPartnerBank,
  submitDbKyc,
  useDbProfile,
  useDbUser,
  useIsAdmin,
} from "@/lib/filax-db";

const PARTNER_BANKS = [
  {
    id: "equity-bcdc",
    name: "Equity BCDC",
    desc: "Banque commerciale panafricaine",
    title: "Partenariat Officiel - Equity BCDC",
    security: "En choisissant Equity BCDC comme institution partenaire, vous bénéficiez d'un ancrage bancaire solide en République Démocratique du Congo. Vos fonds sont stockés et sécurisés sur un sous-compte institutionnel dédié, adossé aux normes de conformité et de protection des actifs d'Equity BCDC. Ce choix est définitif pour garantir la traçabilité et la sécurité juridique de vos transactions sur FILAX.",
  },
  {
    id: "uba-rdc",
    name: "UBA RDC",
    desc: "United Bank for Africa",
    title: "Partenariat Officiel - UBA RDC",
    security: "En sélectionnant UBA RDC, vos avoirs financiers sont gérés à travers un cadre de sécurité bancaire panafricain de premier plan. L'infrastructure d'UBA garantit l'intégrité de vos dépôts et la conformité stricte avec les régulations monétaires en vigueur. Une fois validé, ce choix de domiciliation bancaire devient définitif.",
  },
  {
    id: "bcc",
    name: "Banque Centrale du Congo (BCC)",
    desc: "Institution de régulation",
    title: "Référencement Monétaire - Banque Centrale du Congo",
    security: "Le référencement auprès de la Banque Centrale du Congo (BCC) garantit que les flux et les réserves de la plateforme respectent les orientations de supervision macroéconomique nationales. Vos transactions et conversions de devises s'effectuent sous la haute rigueur des normes de régulation émises par l'institution d'émission. Ce choix institutionnel est définitif.",
  },
  {
    id: "rawbank",
    name: "Rawbank",
    desc: "Banque commerciale en RDC",
    title: "Partenariat Officiel - Rawbank",
    security: "En optant pour Rawbank, première banque de la RDC en termes de fonds propres et de services technologiques, vos capitaux profitent d'un standard de sécurité bancaire ultra-rigoureux. Les fonds sont protégés et isolés conformément aux protocoles de conformité de Rawbank. Ce choix de banque partenaire est irréversible et définitif.",
  },
  {
    id: "tmb",
    name: "TMB",
    desc: "Trust Merchant Bank",
    title: "Partenariat Officiel - TMB",
    security: "En choisissant la TMB, vous confiez la garde de vos liquidités à un réseau bancaire d'envergure nationale reconnu pour sa fiabilité et sa proximité. Vos sous-comptes bénéficient des protocoles de sécurité renforcés de la TMB contre tout risque systémique. La sélection de cette banque est définitive et sécurise l'ensemble de vos opérations sur l'application.",
  },
] as const;

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
  const userId = useDbUser();
  const isAdmin = useIsAdmin(userId);
  const { profile: dbProfile, refresh: refreshProfile } = useDbProfile(userId);
  // Données réelles si connecté, démonstration sinon.
  const profile = dbProfile ?? filax.data.profile;
  const kycStatus = dbProfile?.kycStatus ?? (filax.data.profile.verified ? "verified" : "not_started");
  const [modal, setModal] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email ?? "");
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");
  const [pin, setPin] = useState("");
  const [kycDocType, setKycDocType] = useState("cni");
  const [kycDoc, setKycDoc] = useState<File | null>(null);
  const [kycSelfie, setKycSelfie] = useState<File | null>(null);
  const [kycBusy, setKycBusy] = useState(false);
  const [kycStep, setKycStep] = useState(0);
  const { lang, setLang, t } = useI18n();
  const [code2fa, setCode2fa] = useState("");
  const [bank, setBank] = useState<string | null>(null);
  const [faqBank, setFaqBank] = useState<(typeof PARTNER_BANKS)[number] | null>(null);
  const [bankBusy, setBankBusy] = useState(false);
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  const drawer = (name: string) => ({
    open: openDrawer === name,
    onOpenChange: (open: boolean) => setOpenDrawer(open ? name : null),
  });

  useEffect(() => {
    if (dbProfile?.partnerBank) setBank(dbProfile.partnerBank);
    else if (!userId) setBank(localStorage.getItem("filax-partner-bank"));
  }, [dbProfile?.partnerBank, userId]);

  const verified = !!profile.verified;

  const [shareOpen, setShareOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"personal" | "kyc" | "security">("personal");
  const profileLink =
    typeof window !== "undefined"
      ? `${window.location.origin}${dbProfile?.username ? `/user/${dbProfile.username}` : ""}`
      : "";
  const shareText = `Envoyez-moi de l'argent sur FILAX — ID : ${profile.filaxId} ${profileLink}`;
  const shareTargets = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
    { label: "Messenger", href: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(profileLink)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(profileLink)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileLink)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(profileLink)}&text=${encodeURIComponent(shareText)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}` },
    { label: "SMS", href: `sms:?&body=${encodeURIComponent(shareText)}` },
  ];

  const runKyc = async () => {
    // Connecté : envoi réel des documents puis passage en « en cours d'examen ».
    if (userId) {
      if (!kycDoc || !kycSelfie) {
        toast.error("Ajoutez la pièce d'identité et le selfie");
        return;
      }
      setKycBusy(true);
      setKycStep(1);
      try {
        await submitDbKyc(userId, kycDocType, kycDoc, kycSelfie);
        setKycStep(3);
        await refreshProfile();
        toast.success("Documents envoyés — vérification en cours");
      } catch (e) {
        setKycStep(0);
        toast.error(e instanceof Error ? e.message : "Envoi impossible");
      } finally {
        setKycBusy(false);
      }
      return;
    }
    // Démo locale : simulation en 3 étapes.
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
        <img
          src={profile.photo && !profile.photo.includes("pravatar") ? profile.photo : avatarImg}
          alt={profile.firstName}
          width={56}
          height={56}
          className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-blue/25"
        />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[0.95rem] font-extrabold tracking-tight text-foreground">
            {profile.firstName} {profile.lastName}
          </p>
          <p className="truncate text-[0.68rem] text-muted-foreground">{profile.filaxId}</p>
          <Link
            to="/verification"
            className="press mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.58rem] font-bold"
            style={{
              backgroundColor: `color-mix(in oklab, ${accentVar(verified || kycStatus === "verified" ? "brand-green" : "brand-blue")} 14%, transparent)`,
              color: accentVar(verified || kycStatus === "verified" ? "brand-green" : "brand-blue"),
            }}
          >
            {verified || kycStatus === "verified" ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
            {verified || kycStatus === "verified" ? "Identité vérifiée" : kycStatus === "pending" ? "Vérification en cours" : "Vérifier mon identité"}
          </Link>
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
            aria-label="Partager mon profil"
            onClick={() => setShareOpen(true)}
            className="press flex h-8 w-8 items-center justify-center rounded-xl border border-border text-foreground"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      <div className="mt-4 space-y-3">
        {/* Banque partenaire — bien visible, au-dessus des informations personnelles */}
        <Coffre
          {...drawer("bank")}
          title={t("Choisissez votre banque")}
          subtitle={t("Banque partenaire et sécurité des fonds")}
          icon={<Landmark className="h-4 w-4" />}
          badge={bank ? "✓" : "!"}
        >
          <div className="space-y-3">
            {bank ? (
              <div className="flex items-center gap-3 rounded-2xl border border-brand-green/40 bg-brand-green/[0.08] px-3.5 py-3">
                <BadgeCheck className="h-5 w-5 shrink-0 text-brand-green" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[0.8rem] font-bold text-foreground">{bank}</span>
                  <span className="block text-[0.62rem] text-muted-foreground">{t("Banque validée — choix définitif")}</span>
                </span>
              </div>
            ) : (
              <p className="rounded-2xl bg-brand-blue/[0.07] px-3 py-2.5 text-[0.7rem] leading-relaxed text-muted-foreground">
                {t("Touchez une banque pour lire la FAQ et la valider.")}
              </p>
            )}
            <div className="space-y-2">
              {PARTNER_BANKS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  disabled={!!bank}
                  onClick={() => setFaqBank(b)}
                  className={`press flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition disabled:cursor-default ${
                    bank === b.name ? "border-brand-green/50 bg-brand-green/[0.08]" : bank ? "border-border bg-background opacity-50" : "border-border bg-background"
                  }`}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[0.62rem] font-black text-white"
                    style={{ background: "var(--gradient-blue)" }}
                  >
                    {b.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[0.8rem] font-bold text-foreground">{b.name}</span>
                    <span className="block text-[0.62rem] text-muted-foreground">{b.desc}</span>
                  </span>
                  {bank === b.name && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-green" />}
                </button>
              ))}
            </div>
          </div>
        </Coffre>

        <Modal
          open={!!faqBank}
          onOpenChange={(o) => !o && setFaqBank(null)}
          title={faqBank?.title ?? ""}
          subtitle={t("FAQ & Sécurité")}
          display="responsive"
        >
          {faqBank && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-muted/50 p-4 sm:p-5">
                <p className="text-sm font-extrabold text-foreground">FAQ & Sécurité</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{faqBank.security}</p>
              </div>
              <p className="text-center text-xs font-semibold text-brand-red">Attention : ce choix est irréversible.</p>
              <PrimaryButton
                className="mt-1"
                disabled={bankBusy}
                onClick={async () => {
                  const chosen = faqBank.name;
                  setBankBusy(true);
                  try {
                    if (userId) {
                      await setPartnerBank(chosen);
                      await refreshProfile();
                    }
                    localStorage.setItem("filax-partner-bank", chosen);
                    setBank(chosen);
                    setFaqBank(null);
                    toast.success(t("Banque enregistrée"), { description: chosen });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
                  } finally {
                    setBankBusy(false);
                  }
                }}
              >
                {bankBusy ? "…" : t("Valider ma banque")}
              </PrimaryButton>
            </div>
          )}
        </Modal>

        {/* Paramètres du compte : informations, KYC et sécurité dans un seul tiroir */}
        <Coffre {...drawer("settings")} title="Paramètres du compte" subtitle="Informations, vérification d'identité, sécurité" icon={<User className="h-4 w-4" />} badge={verified ? "OK" : "!"}>
          <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-muted/50 p-1">
            {([["personal", "Informations"], ["kyc", "Identité"], ["security", "Sécurité"]] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setSettingsTab(k)}
                className={`press rounded-xl py-2 text-[0.68rem] font-bold ${settingsTab === k ? "bg-surface text-foreground soft-shadow" : "text-muted-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
          {settingsTab === "personal" && (
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
            <Field label="Pays de résidence">
              <div className="flex items-center justify-between rounded-2xl bg-muted px-3.5 py-3 text-[0.8rem] font-semibold text-foreground">
                <span>🇨🇩 Congo-Kinshasa (RDC)</span>
                <span className="text-[0.58rem] font-bold text-brand-green">Détecté automatiquement</span>
              </div>
            </Field>
            <PrimaryButton
              onClick={async () => {
                if (!firstName.trim() || !lastName.trim()) {
                  toast.error("Le nom et le prénom sont obligatoires");
                  return;
                }
                const updates = { firstName: firstName.trim(), lastName: lastName.trim(), phone, email, birthDate };
                if (userId) {
                  try {
                    await saveDbProfile(updates);
                    await refreshProfile();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
                    return;
                  }
                } else {
                  filax.updateProfile(updates);
                }
                toast.success("Informations mises à jour");
              }}
            >
              Enregistrer
            </PrimaryButton>
          </div>
          )}

          {settingsTab === "kyc" && (
          <div>

          {verified ? (
            <div className="rounded-2xl bg-muted/50 p-3 text-[0.72rem] leading-relaxed text-muted-foreground">
              Votre identité a été vérifiée{profile.verifiedAt ? ` le ${formatDate(profile.verifiedAt)}` : ""}. Vos plafonds de
              transfert sont débloqués.
            </div>
          ) : userId && kycStatus === "pending" ? (
            <div className="rounded-2xl bg-muted/50 p-3 text-[0.72rem] leading-relaxed text-muted-foreground">
              Vos documents sont entre nos mains. La vérification est en cours d'examen — vous serez notifié dès qu'elle
              sera terminée.
            </div>
          ) : userId ? (
            <div className="space-y-3">
              {kycStatus === "rejected" && (
                <p className="rounded-2xl bg-brand-red/10 px-3 py-2 text-[0.7rem] font-semibold text-brand-red">
                  Votre dernière vérification a été refusée. Renvoyez des documents lisibles.
                </p>
              )}
              <Field label="Type de pièce">
                <select
                  value={kycDocType}
                  onChange={(e) => setKycDocType(e.target.value)}
                  className="w-full rounded-2xl bg-muted px-3.5 py-3 text-[0.8rem] font-semibold text-foreground outline-none"
                >
                  <option value="cni">Carte d'identité</option>
                  <option value="passeport">Passeport</option>
                  <option value="permis">Permis de conduire</option>
                </select>
              </Field>
              <Field label="Photo de la pièce">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setKycDoc(e.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl bg-muted px-3.5 py-2.5 text-[0.72rem] text-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-brand-blue/15 file:px-3 file:py-1.5 file:text-[0.7rem] file:font-bold file:text-brand-blue"
                />
              </Field>
              <Field label="Selfie de contrôle">
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => setKycSelfie(e.target.files?.[0] ?? null)}
                  className="w-full rounded-2xl bg-muted px-3.5 py-2.5 text-[0.72rem] text-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-brand-blue/15 file:px-3 file:py-1.5 file:text-[0.7rem] file:font-bold file:text-brand-blue"
                />
              </Field>
              <PrimaryButton color="brand-green" onClick={runKyc} disabled={kycBusy}>
                {kycBusy ? "Envoi en cours…" : "Envoyer mes documents"}
              </PrimaryButton>
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
          </div>
          )}

          {settingsTab === "security" && (
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
              onClick={async () => {
                if (pin.length !== 4) {
                  toast.error("Le code doit contenir 4 chiffres");
                  return;
                }
                if (userId) {
                  try {
                    await setDbPin(pin);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
                    return;
                  }
                } else {
                  filax.updateProfile({ pin });
                }
                setPin("");
                toast.success("Code secret enregistré");
              }}
            >
              {profile.pin ? "Modifier le code" : "Définir le code"}
            </PrimaryButton>

            <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-3 py-2.5">
              <div className="leading-tight">
                <p className="text-[0.76rem] font-bold text-foreground">{t("Double authentification")}</p>
                <p className="text-[0.62rem] text-muted-foreground">Code envoyé au {profile.phone}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!profile.twoFactor}
                onClick={async () => {
                  if (profile.twoFactor) {
                    if (userId) {
                      try {
                        await setDbTwoFactor(false);
                        await refreshProfile();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Action impossible");
                        return;
                      }
                    } else {
                      filax.updateProfile({ twoFactor: false });
                    }
                    toast.success("Double authentification désactivée");
                  } else {
                    setCode2fa("");
                    setModal("2fa");
                  }
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
          )}
          </div>
        </Coffre>

        {isAdmin && (
          <Link to="/admin" className="press flex items-center justify-between rounded-2xl bg-surface px-4 py-3 soft-shadow">
            <span className="text-[0.8rem] font-bold text-foreground">Back-office (KYC et retraits)</span>
            <ShieldCheck className="h-4 w-4 text-brand-green" />
          </Link>
        )}

        <Coffre {...drawer("appearance")} title="Apparence" subtitle="Mode clair ou sombre" icon={<Moon className="h-4 w-4" />}>
          <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-3 py-2.5">
            <span className="text-[0.75rem] font-semibold text-foreground">Changer le mode d'apparence</span>
            <ThemeToggle />
          </div>
        </Coffre>

        <Coffre {...drawer("language")} title={t("Langue")} subtitle={t(lang === "fr" ? "Français" : "Anglais")} icon={<Languages className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            {(["fr", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLang(l);
                  toast.success(l === "fr" ? "Langue : Français" : "Language: English");
                }}
                className={`press rounded-2xl py-3 text-[0.75rem] font-bold transition ${
                  lang === l ? "bg-brand-blue/15 text-brand-blue" : "bg-muted text-muted-foreground"
                }`}
              >
                {t(l === "fr" ? "Français" : "Anglais")}
              </button>
            ))}
          </div>
        </Coffre>

        {userId && (
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.assign("/");
            }}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[0.78rem] font-bold text-brand-red soft-shadow"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        )}
      </div>

      <div className="mt-4">
        <BankBadge />
      </div>

      <Modal open={modal === "2fa"} onOpenChange={(o) => !o && setModal(null)} title={t("Vérification de sécurité")}>
        <div className="space-y-4">
          <p className="text-[0.75rem] text-muted-foreground">
            Veuillez entrer le code à 6 chiffres envoyé sur votre numéro/email
          </p>
          <TextInput
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={code2fa}
            onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-lg font-bold tracking-[0.6em]"
          />
          <PrimaryButton
            disabled={code2fa.length !== 6}
            onClick={async () => {
              if (userId) {
                try {
                  await setDbTwoFactor(true);
                  await refreshProfile();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Action impossible");
                  return;
                }
              } else {
                filax.updateProfile({ twoFactor: true });
              }
              setModal(null);
              toast.success("Double authentification activée");
            }}
          >
            {t("Confirmer")}
          </PrimaryButton>
        </div>
      </Modal>

      <InviteModal open={modal === "invite"} onOpenChange={(o) => !o && setModal(null)} filaxId={profile.filaxId} />
      <Modal open={shareOpen} onOpenChange={setShareOpen} title="Partager mon profil" subtitle={profile.filaxId}>
        <div className="grid grid-cols-3 gap-2">
          {shareTargets.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" onClick={() => setShareOpen(false)}
              className="press rounded-2xl border border-border bg-surface py-3 text-center text-[0.72rem] font-bold text-foreground">
              {s.label}
            </a>
          ))}
        </div>
        <PrimaryButton className="mt-3" onClick={async () => {
          if (navigator.share) { try { await navigator.share({ title: "Mon profil FILAX", text: shareText, url: profileLink }); return; } catch { /* annulé */ } }
          await navigator.clipboard?.writeText(shareText); toast.success("Lien copié");
        }}>Autres applications</PrimaryButton>
      </Modal>
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
