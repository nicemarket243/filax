import { useState } from "react";
import { ArrowRight, CheckCircle2, Globe2, Loader2, LockKeyhole, Phone, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { FilaxLogo } from "@/components/filax-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Mode = "signup" | "login";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("243") ? `+${digits}` : `+243${digits.replace(/^0/, "")}`;
}

export function PublicWelcome({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (mode === "signup" && name.trim().length < 2) {
      toast.error("Indiquez votre nom complet");
      return;
    }
    if (phone.replace(/\D/g, "").length < 9) {
      toast.error("Entrez un numéro de téléphone valide");
      return;
    }
    setBusy(true);
    const [firstName, ...lastName] = name.trim().split(/\s+/);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizePhone(phone),
      options: {
        shouldCreateUser: mode === "signup",
        data: mode === "signup" ? { first_name: firstName, last_name: lastName.join(" "), phone: normalizePhone(phone) } : undefined,
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
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: normalizePhone(phone), token: code, type: "sms" });
    setBusy(false);
    if (error) {
      toast.error("Code invalide ou expiré");
      return;
    }
    localStorage.setItem("filax-onboarded", "1");
    onAuthenticated();
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <div className="max-w-xl">
          <FilaxLogo height={32} />
          <p className="mt-12 text-[0.72rem] font-bold uppercase text-brand-green">Finance connectée et sécurisée</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.08] text-foreground sm:text-6xl">Prenez le contrôle de vos finances.</h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">Épargnez, transférez et cotisez en groupe depuis une seule expérience financière pensée pour vous.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[[ShieldCheck, "Identité vérifiée"], [Users, "Cotisations en groupe"], [Globe2, "Comptes multi-devises"]].map(([Icon, label]) => {
              const FeatureIcon = Icon as typeof ShieldCheck;
              return <div key={label as string} className="flex items-center gap-2 text-sm font-semibold"><FeatureIcon className="h-4 w-4 text-brand-green" />{label as string}</div>;
            })}
          </div>
        </div>

        <section className="rounded-3xl bg-surface p-5 soft-shadow sm:p-7">
          <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
            {(["signup", "login"] as const).map((value) => (
              <Button key={value} type="button" variant="ghost" onClick={() => { setMode(value); setSent(false); setCode(""); }} className={mode === value ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"}>
                {value === "signup" ? "Inscription" : "Connexion"}
              </Button>
            ))}
          </div>
          <div className="mt-6">
            <h2 className="text-xl font-extrabold">{mode === "signup" ? "Créer votre compte FILAX" : "Retrouver votre compte"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Un code confidentiel vous sera envoyé par SMS.</p>
          </div>
          <div className="mt-5 space-y-3">
            {mode === "signup" && !sent && <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" autoComplete="name" />}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 000 000 000" inputMode="tel" autoComplete="tel" disabled={sent} />
            </div>
            {sent && (
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9 text-center text-lg font-bold" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Code à 6 chiffres" inputMode="numeric" autoComplete="one-time-code" />
              </div>
            )}
            <Button type="button" onClick={sent ? verify : sendCode} disabled={busy || (sent && code.length !== 6)} className="w-full bg-brand-blue text-primary-foreground hover:bg-brand-blue/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : sent ? <><CheckCircle2 className="h-4 w-4" /> Valider le code</> : <>Recevoir mon code <ArrowRight className="h-4 w-4" /></>}
            </Button>
            {sent && <Button type="button" variant="ghost" onClick={() => setSent(false)} className="w-full text-muted-foreground">Modifier le numéro</Button>}
          </div>
          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">En continuant, vous acceptez les conditions d’utilisation et la politique de confidentialité FILAX.</p>
        </section>
      </section>
    </main>
  );
}