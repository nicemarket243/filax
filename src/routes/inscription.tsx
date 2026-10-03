import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Languages, Loader2, Moon, Phone, Sun, UserRound } from "lucide-react";
import { toast } from "sonner";

import { FilaxLogo } from "@/components/filax-logo";
import { Field, PrimaryButton, TextInput } from "@/components/filax/ui-kit";
import { useTheme } from "@/components/filax/ui-kit";
import { useFilax } from "@/lib/filax-store";
import { saveDbProfile, useDbUser } from "@/lib/filax-db";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Bienvenue sur FILAX" },
      {
        name: "description",
        content: "Créez votre compte FILAX en quelques secondes : nom, téléphone, langue et apparence. La vérification d'identité se fait ensuite depuis votre profil.",
      },
      { property: "og:title", content: "Bienvenue sur FILAX" },
      { property: "og:description", content: "Votre argent, vos groupes, vos objectifs — en quelques secondes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

type Step = "info" | "otp" | "prefs" | "done";

function OnboardingPage() {
  const navigate = useNavigate();
  const userId = useDbUser();
  const filax = useFilax();
  const { lang, setLang, t } = useI18n();
  const { dark, toggle } = useTheme();

  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const sendCode = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Entrez votre nom et votre prénom.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 8) {
      toast.error("Entrez un numéro de téléphone valide.");
      return;
    }
    setLoading(true);
    // Simulation : aucun SMS réel n'est envoyé, le code est validé localement.
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      toast.success(t("Code envoyé par SMS"), { description: phone });
    }, 700);
  };

  const verifyCode = () => {
    if (code.length !== 6) {
      toast.error("Entrez le code à 6 chiffres.");
      return;
    }
    setStep("prefs");
  };

  const finish = async () => {
    setLoading(true);
    const fullPhone = phone.startsWith("+") ? phone : `+243 ${phone}`;
    if (userId) {
      try {
        await saveDbProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone: fullPhone });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
        setLoading(false);
        return;
      }
    } else {
      filax.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone: fullPhone });
    }
    setLoading(false);
    setStep("done");
    setTimeout(() => navigate({ to: "/" }), 900);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-12 pt-10">
      <div className="flex justify-center">
        <FilaxLogo height={26} />
      </div>

      <div className="mt-10 flex-1">
        {step === "info" && (
          <div className="animate-fade-up space-y-5">
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                <UserRound className="h-5 w-5" />
              </span>
              <h1 className="text-metal mt-4 text-xl font-extrabold tracking-tight">{t("Bienvenue sur FILAX")}</h1>
              <p className="mt-1 text-[0.75rem] text-muted-foreground">{t("Quelques secondes suffisent pour commencer.")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("Prénom")}>
                <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Peter" />
              </Field>
              <Field label={t("Nom")}>
                <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mukendi" />
              </Field>
            </div>
            <Field label={t("Numéro de téléphone")}>
              <div className="flex gap-2">
                <span className="flex items-center rounded-xl border border-border bg-muted px-3 text-[0.8rem] font-bold text-foreground">
                  🇨🇩 +243
                </span>
                <TextInput
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="812 345 678"
                />
              </div>
            </Field>
            <PrimaryButton onClick={sendCode} disabled={loading}>
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("Envoyer le code")}
            </PrimaryButton>
          </div>
        )}

        {step === "otp" && (
          <div className="animate-fade-up space-y-5">
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                <Phone className="h-5 w-5" />
              </span>
              <h1 className="text-metal mt-4 text-xl font-extrabold tracking-tight">{t("Code de vérification")}</h1>
              <p className="mt-1 text-[0.75rem] text-muted-foreground">
                {t("Code envoyé par SMS")} · {phone}
              </p>
            </div>
            <TextInput
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-lg font-bold tracking-[0.6em]"
            />
            <PrimaryButton onClick={verifyCode} disabled={code.length !== 6}>
              {t("Valider le code")}
            </PrimaryButton>
            <button type="button" onClick={sendCode} className="w-full text-center text-[0.72rem] font-semibold text-brand-blue">
              {t("Renvoyer le code")}
            </button>
          </div>
        )}

        {step === "prefs" && (
          <div className="animate-fade-up space-y-6">
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                <Languages className="h-5 w-5" />
              </span>
              <h1 className="text-metal mt-4 text-xl font-extrabold tracking-tight">{t("Choisir la langue")}</h1>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["fr", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`press rounded-2xl py-3.5 text-[0.8rem] font-bold transition ${
                    lang === l ? "bg-brand-blue/15 text-brand-blue ring-1 ring-brand-blue/40" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {l === "fr" ? "Français" : "English"}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-2 text-center text-[0.72rem] font-semibold text-muted-foreground">{t("Mode d'apparence")}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => dark && toggle()}
                  className={`press flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[0.8rem] font-bold transition ${
                    !dark ? "bg-brand-blue/15 text-brand-blue ring-1 ring-brand-blue/40" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Sun className="h-4 w-4" /> {t("Clair")}
                </button>
                <button
                  type="button"
                  onClick={() => !dark && toggle()}
                  className={`press flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[0.8rem] font-bold transition ${
                    dark ? "bg-brand-blue/15 text-brand-blue ring-1 ring-brand-blue/40" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Moon className="h-4 w-4" /> {t("Sombre")}
                </button>
              </div>
            </div>
            <PrimaryButton onClick={finish} disabled={loading}>
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("Commencer")}
            </PrimaryButton>
          </div>
        )}

        {step === "done" && (
          <div className="animate-fade-up flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/15">
              <CheckCircle2 className="h-8 w-8 text-brand-green" />
            </span>
            <h2 className="text-lg font-bold text-foreground">
              {t("Bienvenue sur FILAX")}, {firstName} !
            </h2>
            <p className="text-[0.75rem] text-muted-foreground">{t("Vos fonds sont sécurisés par notre banque partenaire.")}</p>
          </div>
        )}
      </div>
    </main>
  );
}
