import { useEffect, useState } from "react";
import { Globe2, Loader2, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { FilaxLogo } from "@/components/filax-logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useServerFn } from "@tanstack/react-start";
import { sendFilaxIdCode, verifyFilaxIdCode } from "@/lib/filax-auth.functions";
import { CountryPhoneInput, usePhoneCountry } from "@/components/filax/country-phone-input";
import { internationalPhone, type CountryCode } from "@/lib/countries";

type Mode = "signup" | "login";
export const AUTH_INTENT_KEY = "filax-auth-intent";
type Method = "phone" | "filax";

const FIELD =
  "w-full rounded-xl border border-border/70 bg-transparent px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-brand-blue/60";

const REMEMBER_KEY = "filax-remembered-login";
const REMEMBER_MS = 30 * 86_400_000;
type Remembered = { method: Method; phone?: string; country?: CountryCode; filaxId?: string; expires: number };

export const DISCOVERY_KEY = "filax-discovery";
export type Discovery = { name: string; phone: string };

export function PublicWelcome({ onAuthenticated: done, onDiscover }: { onAuthenticated: () => void; onDiscover?: (d: Discovery) => void }) {
  const discover = () => {
    if (name.trim().length < 2) return void toast.error("Indiquez votre nom complet");
    if (phone.replace(/\D/g, "").length < 6) return void toast.error("Entrez votre numéro de téléphone");
    onDiscover?.({ name: name.trim().slice(0, 80), phone: phone.trim().slice(0, 20) });
  };
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const { country, chooseCountry } = usePhoneCountry();
  const [middleName, setMiddleName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<Method>("phone");
  const [filaxId, setFilaxId] = useState("");
  const sendId = useServerFn(sendFilaxIdCode);
  const verifyId = useServerFn(verifyFilaxIdCode);

  // Identifiants mémorisés (jamais de code ni de mot de passe), effacés automatiquement après 1 mois.
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(REMEMBER_KEY) ?? "null") as Remembered | null;
      if (!r) return;
      if (r.expires < Date.now()) return void localStorage.removeItem(REMEMBER_KEY);
      setMode("login");
      setMethod(r.method);
      if (r.phone) setPhone(r.phone);
      if (r.country || r.phone) chooseCountry(r.country ?? "CD");
      if (r.filaxId) setFilaxId(r.filaxId);
    } catch {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, []);

  const onAuthenticated = () => {
    const entry: Remembered = { method, country, phone: method === "phone" ? phone : undefined, filaxId: method === "filax" ? filaxId.trim() : undefined, expires: Date.now() + REMEMBER_MS };
    const existing = localStorage.getItem(REMEMBER_KEY);
    if (!existing) {
      toast("Enregistrer vos informations de connexion ?", {
        description: "Vous n'aurez plus à les retaper pendant 1 mois.",
        duration: 15000,
        action: { label: "Enregistrer", onClick: () => localStorage.setItem(REMEMBER_KEY, JSON.stringify(entry)) },
      });
    }
    done();
  };

  const google = async () => {
    setBusy(true);
    // En mode Connexion, on vérifiera au retour que ce Gmail correspond à un compte existant.
    sessionStorage.setItem(AUTH_INTENT_KEY, mode);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    if ((r as { error?: Error })?.error) {
      setBusy(false);
      toast.error("Connexion Google impossible");
      return;
    }
    localStorage.setItem("filax-onboarded", "1");
  };

  const sendIdCode = async () => {
    if (!/^FLX[-A-Z0-9]{3,}$/i.test(filaxId.trim())) {
      toast.error("ID FILAX invalide (format FLX…)");
      return;
    }
    setBusy(true);
    try {
      const r = await sendId({ data: { filaxId: filaxId.trim() } });
      if (!r.ok) return void toast.error(r.error);
      setSent(true);
      toast.success(r.channel === "email" ? `Code envoyé à ${r.masked}` : `Code envoyé par SMS au ${r.masked}`);
    } finally {
      setBusy(false);
    }
  };

  const verifyIdCode = async () => {
    setBusy(true);
    try {
      const r = await verifyId({ data: { filaxId: filaxId.trim(), token: code } });
      if (!r.ok) return void toast.error(r.error);
      await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      localStorage.setItem("filax-onboarded", "1");
      onAuthenticated();
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async () => {
    if (mode === "signup" && name.trim().length < 2) {
      toast.error("Indiquez votre nom complet");
      return;
    }
    if (mode === "signup" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      toast.error("Entrez une adresse e-mail valide");
      return;
    }
    const normalized = internationalPhone(phone, country);
    if (!normalized) {
      toast.error("Entrez un numéro de téléphone valide");
      return;
    }
    setBusy(true);
    const [firstName, ...lastName] = name.trim().split(/\s+/);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
      options: {
        shouldCreateUser: mode === "signup",
        data: mode === "signup" ? { first_name: firstName, last_name: lastName.join(" "), middle_name: middleName.trim().slice(0, 80), contact_email: email.trim().slice(0, 255), phone: normalized } : undefined,
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Code SMS non envoyé", { description: error.message });
      return;
    }
    setSent(true);
    toast.success("Code envoyé par SMS");
  };

  const verify = async () => {
    if (code.length !== 6) return;
    const normalized = internationalPhone(phone, country);
    if (!normalized) return void toast.error("Entrez un numéro de téléphone valide");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: normalized, token: code, type: "sms" });
    setBusy(false);
    if (error) {
      toast.error("Code invalide ou expiré");
      return;
    }
    localStorage.setItem("filax-onboarded", "1");
    onAuthenticated();
  };

  return (
    // Thème : clair par défaut, sinon dernière préférence enregistrée (classe "dark" sur <html>).
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-background px-6 py-14 text-foreground">
      {/* Haltes lumineuses très discrètes */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-20%] h-96 w-96 rounded-full blur-[140px]"
        style={{ backgroundColor: "color-mix(in oklab, var(--brand-blue) 12%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-[-20%] h-96 w-96 rounded-full blur-[140px]"
        style={{ backgroundColor: "color-mix(in oklab, var(--brand-green) 8%, transparent)" }}
      />

      <div className="animate-fade-up relative z-10 flex w-full max-w-sm flex-col">
        <div className="flex justify-center">
          <FilaxLogo height={30} />
        </div>

        <h1 className="mt-14 text-center font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          L'excellence financière, simplifiée.
        </h1>

        {/* Onglets Inscription / Connexion */}
        <div className="mt-12 flex border-b border-border">
          {(["signup", "login"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setSent(false);
                setCode("");
              }}
              className={`flex-1 pb-3.5 text-sm font-medium transition-colors ${
                mode === value
                  ? "border-b-2 border-brand-green text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "signup" ? "Inscription" : "Connexion"}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 p-1">
            {(["phone", "filax"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMethod(m); setSent(false); setCode(""); }}
                className={`rounded-lg py-2 text-xs font-medium transition-colors ${method === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m === "phone" ? "Téléphone" : "ID FILAX"}
              </button>
            ))}
          </div>

          {mode === "signup" && method === "phone" && !sent && (
            <div className="space-y-1.5">
              <label htmlFor="filax-name" className="ml-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Nom complet
              </label>
              <input
                id="filax-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jean Kabasele"
                autoComplete="name"
                className={FIELD}
              />
              <label htmlFor="filax-middle" className="ml-1 block pt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Post-nom</label>
              <input id="filax-middle" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Mukendi" maxLength={80} className={FIELD} />
              <label htmlFor="filax-email" className="ml-1 block pt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Adresse e-mail</label>
              <input id="filax-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" maxLength={255} className={FIELD} />
            </div>
          )}

          {method === "filax" && (
            <div className="space-y-1.5">
              <label htmlFor="filax-id" className="ml-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                ID FILAX
              </label>
              <input
                id="filax-id"
                value={filaxId}
                onChange={(e) => setFilaxId(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 36))}
                placeholder="FLX-XXXXXX"
                disabled={sent}
                autoCapitalize="characters"
                className={`${FIELD} font-mono tracking-wider`}
              />
            </div>
          )}

          {method === "phone" && (
          <div className="space-y-1.5">
            <label htmlFor="filax-phone" className="ml-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Téléphone
            </label>
            <CountryPhoneInput country={country} onCountryChange={chooseCountry} phone={phone} onPhoneChange={setPhone} disabled={sent || busy} />
          </div>
          )}

          {sent && (
            <div className="space-y-1.5">
              <label htmlFor="filax-code" className="ml-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Code à 6 chiffres
              </label>
              <input
                id="filax-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                inputMode="numeric"
                autoComplete="one-time-code"
                className={`${FIELD} text-center text-lg font-bold tracking-[0.4em]`}
              />
            </div>
          )}

          <button
            type="button"
            onClick={method === "filax" ? (sent ? verifyIdCode : sendIdCode) : sent ? verify : sendCode}
            disabled={busy || (sent && code.length !== 6)}
            className="press flex w-full items-center justify-center gap-2 rounded-xl bg-filax-blue py-4 text-sm font-semibold text-primary-foreground shadow-[0_14px_34px_-12px_var(--brand-blue)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : sent ? (
              "Valider le code"
            ) : mode === "login" ? (
              "Se connecter"
            ) : (
              "Recevoir mon code"
            )}
          </button>

          {sent && (
            <button
              type="button"
              onClick={() => setSent(false)}
              className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {method === "filax" ? "Modifier l'ID FILAX" : "Modifier le numéro"}
            </button>
          )}

          {mode === "signup" && method === "phone" && !sent && onDiscover && (
            <button type="button" onClick={discover} disabled={busy} className="press w-full rounded-xl border border-border/70 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50">
              Découvrir l'app sans code (nom et numéro)
            </button>
          )}

          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
            <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="press flex w-full items-center justify-center gap-2.5 rounded-xl border border-border/70 bg-transparent py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8Z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.8A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8Z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z"/></svg>
            {mode === "signup" ? "S'inscrire avec Gmail" : "Continuer avec Gmail"}
          </button>

          <p className="px-4 text-center text-[11px] leading-relaxed text-muted-foreground/70">
            En continuant, vous recevrez un code de vérification. Vous acceptez les conditions d'utilisation et la politique de confidentialité FILAX.
          </p>
        </div>

        {/* Badges de confiance discrets */}
        <div className="mt-16 flex items-center justify-between gap-4 border-t border-border/50 pt-7 opacity-40">
          {[
            [ShieldCheck, "Identité vérifiée"],
            [Users, "Cotisations en groupe"],
            [Globe2, "Comptes multi-devises"],
          ].map(([Icon, label]) => {
            const FeatureIcon = Icon as typeof ShieldCheck;
            return (
              <div key={label as string} className="flex items-center gap-1.5">
                <FeatureIcon className="h-3.5 w-3.5" />
                <span className="text-[9px] font-medium uppercase tracking-[0.14em]">{label as string}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
