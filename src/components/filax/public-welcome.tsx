import { useEffect, useState } from "react";
import { Globe2, Loader2, Mail, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { FilaxLogo } from "@/components/filax-logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useServerFn } from "@tanstack/react-start";
import { registerFilaxAccount, resolveLoginChannels, sendLoginCode, verifyLoginCode } from "@/lib/filax-auth.functions";
import { CountryPhoneInput, usePhoneCountry } from "@/components/filax/country-phone-input";
import { Modal } from "@/components/filax/ui-kit";
import { internationalPhone, type CountryCode } from "@/lib/countries";

type Mode = "signup" | "login";
export const AUTH_INTENT_KEY = "filax-auth-intent";
type ContactMethod = "phone" | "email";
type LoginChannel = { channel: "email" | "sms"; masked: string; available: boolean };

const FIELD =
  "w-full rounded-xl border border-border/70 bg-transparent px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-brand-blue/60";
const LABEL = "ml-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground";

const REMEMBER_KEY = "filax-remembered-login";
const REMEMBER_MS = 30 * 86_400_000;
type Remembered = { name: string; identifier: string; country?: CountryCode; expires: number };

export const DISCOVERY_KEY = "filax-discovery";
export type Discovery = { name: string; phone: string };

export function PublicWelcome({ onAuthenticated: done, onDiscover }: { onAuthenticated: () => void; onDiscover?: (d: Discovery) => void }) {
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [postNom, setPostNom] = useState("");
  const [contact, setContact] = useState<ContactMethod>("phone");
  const [phone, setPhone] = useState("");
  const { country, chooseCountry } = usePhoneCountry();
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [channels, setChannels] = useState<LoginChannel[] | null>(null);
  const [sentTo, setSentTo] = useState<LoginChannel | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [remembered, setRemembered] = useState<Remembered | null>(null);

  const register = useServerFn(registerFilaxAccount);
  const resolveChannels = useServerFn(resolveLoginChannels);
  const sendCode = useServerFn(sendLoginCode);
  const verifyCode = useServerFn(verifyLoginCode);

  const discover = () => {
    if (name.trim().length < 2) return void toast.error("Indiquez votre nom");
    if (phone.replace(/\D/g, "").length < 6) return void toast.error("Entrez un numéro de téléphone valide");
    onDiscover?.({ name: name.trim().slice(0, 80), phone: phone.trim().slice(0, 20) });
  };

  // Appareil reconnu : profil mémorisé (jamais de code ni de mot de passe), effacé après 1 mois.
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(REMEMBER_KEY) ?? "null") as Remembered | null;
      if (!r) return;
      if (r.expires < Date.now()) return void localStorage.removeItem(REMEMBER_KEY);
      setRemembered(r);
    } catch {
      localStorage.removeItem(REMEMBER_KEY);
    }
  }, []);

  const proposeRemember = (entry: Omit<Remembered, "expires">) => {
    if (localStorage.getItem(REMEMBER_KEY)) return;
    toast("Enregistrer vos informations de connexion ?", {
      description: "Vous n'aurez plus à les retaper pendant 1 mois.",
      duration: 15000,
      action: { label: "Enregistrer", onClick: () => localStorage.setItem(REMEMBER_KEY, JSON.stringify({ ...entry, expires: Date.now() + REMEMBER_MS })) },
    });
  };

  const finish = (entry: Omit<Remembered, "expires">) => {
    localStorage.setItem("filax-onboarded", "1");
    proposeRemember(entry);
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

  // ——— Inscription : nom, post-nom, téléphone OU e-mail → entrée directe, ID généré automatiquement.
  const signup = async () => {
    if (name.trim().length < 2) return void toast.error("Indiquez votre nom");
    if (postNom.trim().length < 2) return void toast.error("Indiquez votre post-nom");
    const normalized = contact === "phone" ? internationalPhone(phone, country) : null;
    if (contact === "phone" && !normalized) return void toast.error("Entrez un numéro de téléphone valide");
    if (contact === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return void toast.error("Entrez une adresse e-mail valide");
    setBusy(true);
    try {
      const r = await register({
        data: {
          firstName: name.trim(),
          postNom: postNom.trim(),
          channel: contact,
          email: contact === "email" ? email.trim() : undefined,
          phone: contact === "phone" ? normalized! : undefined,
        },
      });
      if (!r.ok) return void toast.error(r.error);
      await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      toast.success("Bienvenue sur FILAX", { description: r.filaxId ? `Votre ID FILAX : ${r.filaxId}` : undefined });
      finish({ name: `${name.trim()} ${postNom.trim()}`, identifier: contact === "email" ? email.trim() : normalized!, country });
    } finally {
      setBusy(false);
    }
  };

  // ——— Connexion : identifiant flexible → choix du canal → code à 6 chiffres.
  const resolveLogin = async (id?: string) => {
    const value = (id ?? identifier).trim();
    if (value.length < 3) return void toast.error("Entrez votre identifiant");
    setBusy(true);
    try {
      const r = await resolveChannels({ data: { identifier: value } });
      if (!r.ok) return void toast.error(r.error);
      setIdentifier(value);
      setSentTo(null);
      setCode("");
      setChannels(r.channels);
    } finally {
      setBusy(false);
    }
  };

  const pickChannel = async (channel: LoginChannel) => {
    if (!channel.available) return;
    setBusy(true);
    try {
      const r = await sendCode({ data: { identifier, channel: channel.channel } });
      if (!r.ok) return void toast.error(r.error);
      setSentTo(channel);
      toast.success(`Code envoyé à ${r.masked}`);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6 || !sentTo) return;
    setBusy(true);
    try {
      const r = await verifyCode({ data: { identifier, channel: sentTo.channel, token: code } });
      if (!r.ok) return void toast.error(r.error);
      await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      setChannels(null);
      setSentTo(null);
      finish({ name: remembered?.name ?? "Utilisateur", identifier, country });
    } finally {
      setBusy(false);
    }
  };

  const useRemembered = () => {
    if (!remembered) return;
    setMode("login");
    if (remembered.country) chooseCountry(remembered.country);
    void resolveLogin(remembered.identifier);
  };

  return (
    // Thème : clair par défaut, sinon dernière préférence enregistrée (classe "dark" sur <html>).
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden bg-background px-6 py-14 text-foreground">
      {/* Halos lumineux très discrets */}
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

        {/* Appareil reconnu : reprise en un clic */}
        {remembered && (
          <button
            type="button"
            onClick={useRemembered}
            disabled={busy}
            className="press mt-10 flex w-full items-center gap-3 rounded-2xl border border-border/70 p-3.5 text-left transition-colors hover:bg-muted/40 disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-filax-blue text-sm font-bold text-primary-foreground">
              {remembered.name.trim().charAt(0).toUpperCase() || "F"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">Continuer en tant que {remembered.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{remembered.identifier}</span>
            </span>
          </button>
        )}

        {/* Onglets Inscription / Connexion */}
        <div className="mt-10 flex border-b border-border">
          {(["signup", "login"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
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
          {mode === "signup" ? (
            <>
              <div className="space-y-1.5">
                <label htmlFor="filax-name" className={LABEL}>Nom</label>
                <input id="filax-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kabasele" autoComplete="family-name" maxLength={80} className={FIELD} />
                <label htmlFor="filax-postnom" className={`${LABEL} pt-3`}>Post-nom</label>
                <input id="filax-postnom" value={postNom} onChange={(e) => setPostNom(e.target.value)} placeholder="Mukendi" autoComplete="additional-name" maxLength={80} className={FIELD} />
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/70 p-1">
                {(["phone", "email"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setContact(m)}
                    className={`rounded-lg py-2 text-xs font-medium transition-colors ${contact === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {m === "phone" ? "Téléphone" : "E-mail"}
                  </button>
                ))}
              </div>

              {contact === "phone" ? (
                <div className="space-y-1.5">
                  <label htmlFor="filax-phone" className={LABEL}>Téléphone</label>
                  <CountryPhoneInput country={country} onCountryChange={chooseCountry} phone={phone} onPhoneChange={setPhone} disabled={busy} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label htmlFor="filax-email" className={LABEL}>Adresse e-mail</label>
                  <input id="filax-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" maxLength={255} className={FIELD} />
                </div>
              )}

              <button
                type="button"
                onClick={signup}
                disabled={busy}
                className="press flex w-full items-center justify-center gap-2 rounded-xl bg-filax-blue py-4 text-sm font-semibold text-primary-foreground shadow-[0_14px_34px_-12px_var(--brand-blue)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "S'inscrire"}
              </button>

              {onDiscover && (
                <button type="button" onClick={discover} disabled={busy} className="press w-full rounded-xl border border-border/70 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 disabled:opacity-50">
                  Découvrir l'app sans compte (nom et numéro)
                </button>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="filax-identifier" className={LABEL}>Identifiant</label>
                <input
                  id="filax-identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.slice(0, 255))}
                  placeholder="Téléphone, ID FILAX ou e-mail"
                  autoComplete="username"
                  className={FIELD}
                />
              </div>

              <button
                type="button"
                onClick={() => void resolveLogin()}
                disabled={busy}
                className="press flex w-full items-center justify-center gap-2 rounded-xl bg-filax-blue py-4 text-sm font-semibold text-primary-foreground shadow-[0_14px_34px_-12px_var(--brand-blue)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
              </button>
            </>
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
            En continuant, vous acceptez les conditions d'utilisation et la politique de confidentialité FILAX.
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

      {/* Fenêtre de choix du canal puis saisie du code à 6 chiffres */}
      <Modal
        open={channels !== null}
        onOpenChange={(o) => {
          if (!o) {
            setChannels(null);
            setSentTo(null);
            setCode("");
          }
        }}
        title="Recevoir mon code"
        subtitle={sentTo ? `Code envoyé à ${sentTo.masked}` : "Choisissez le canal de réception de votre code de sécurité à 6 chiffres."}
      >
        {!sentTo ? (
          <div className="space-y-3">
            {(channels ?? []).map((c) => (
              <button
                key={c.channel}
                type="button"
                onClick={() => void pickChannel(c)}
                disabled={busy || !c.available}
                className="press flex w-full items-center gap-3 rounded-xl border border-border/70 p-4 text-left transition-colors hover:bg-muted/40 disabled:opacity-50"
              >
                {c.channel === "email" ? <Mail className="h-5 w-5 shrink-0 text-brand-blue" /> : <MessageSquare className="h-5 w-5 shrink-0 text-brand-green" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{c.channel === "email" ? "E-mail" : "SMS"}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.masked}</span>
                </span>
                {!c.available && <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">Indisponible pour le moment</span>}
              </button>
            ))}
            {busy && <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        ) : (
          <div className="space-y-4">
            <input
              id="filax-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Code à 6 chiffres"
              className={`${FIELD} text-center text-lg font-bold tracking-[0.4em]`}
            />
            <button
              type="button"
              onClick={verify}
              disabled={busy || code.length !== 6}
              className="press flex w-full items-center justify-center gap-2 rounded-xl bg-filax-blue py-4 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider le code"}
            </button>
            <button type="button" onClick={() => { setSentTo(null); setCode(""); }} className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground">
              Changer de canal
            </button>
          </div>
        )}
      </Modal>
    </main>
  );
}
