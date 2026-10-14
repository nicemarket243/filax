import { useEffect, useState } from "react";
import { CheckCircle2, FlaskConical, MessageSquare, RotateCcw, Smartphone, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Modal, TextInput } from "./ui-kit";
import { useI18n } from "@/lib/i18n";

type Mode = "stk" | "sms";
type StkState = "form" | "pending" | "accepted" | "rejected" | "expired";
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

// Deliberately isolated: no financial, authentication, persistence or messaging imports.
function SimulationContent({ initialMode }: { initialMode: Mode }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [operator, setOperator] = useState("M-Pesa");
  const [stk, setStk] = useState<StkState>("form");
  const [stkDeadline, setStkDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [code, setCode] = useState("");
  const [entered, setEntered] = useState("");
  const [deadline, setDeadline] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const locked = attempts >= 3;
  const validPhone = /^\+?\d{9,15}$/.test(phone.replace(/[\s()-]/g, ""));
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (stk === "pending" && now >= stkDeadline) setStk("expired");
  }, [now, stk, stkDeadline]);

  function newCode() {
    if (!validPhone || locked || cooldown > 0) return;
    const random = new Uint32Array(1);
    window.crypto.getRandomValues(random);
    setCode(String(100000 + (random[0] ?? 0) % 900000));
    const time = Date.now();
    setNow(time);
    setDeadline(time + 150000);
    setResendAt(time + 30000);
    setEntered("");
    setVerified(false);
    setError("");
  }

  return <div className="space-y-4">
    <p className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 p-3 text-xs font-semibold text-foreground">
      <FlaskConical className="mb-1 inline h-4 w-4 text-brand-gold" /> {t("Simulation uniquement — aucun paiement, aucun SMS réel. Aucun solde ni historique n'est modifié.")}
    </p>
    <div className="grid grid-cols-2 gap-2" role="tablist" aria-label={t("Simulation")}>
      {([ ["stk", "Mobile Money STK", Smartphone], ["sms", "SMS OTP", MessageSquare] ] as const).map(([id, label, Icon]) =>
        <Button key={id} role="tab" aria-selected={mode === id} variant={mode === id ? "secondary" : "ghost"} onClick={() => setMode(id)}><Icon />{label}</Button>)}
    </div>
    <Field label={t("Téléphone de test")}><TextInput aria-label={t("Téléphone de test")} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+243 000 000 000" autoComplete="off" disabled={stk === "pending" || (!!code && !verified)} /></Field>
    {mode === "stk" ? <div className="space-y-4">
      {stk === "form" ? <>
        <Field label={t("Opérateur")}><select aria-label={t("Opérateur")} className="w-full rounded-lg border border-input bg-background p-2 text-sm" value={operator} onChange={e => setOperator(e.target.value)}>{["M-Pesa", "Orange Money", "Airtel Money"].map(item => <option key={item}>{item}</option>)}</select></Field>
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <Field label={t("Montant fictif")}><TextInput aria-label={t("Montant fictif")} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></Field>
          <Field label={t("Devise")}><select aria-label={t("Devise")} value={currency} onChange={e => setCurrency(e.target.value)} className="h-11 w-full rounded-lg border border-input bg-background p-2 text-sm"><option>USD</option><option>CDF</option></select></Field>
        </div>
        <Button className="w-full" disabled={!validPhone || !Number.isFinite(Number(amount)) || Number(amount) <= 0} onClick={() => { setNow(Date.now()); setStkDeadline(Date.now() + 60000); setStk("pending"); }}><Smartphone />{t("Simuler la demande STK")}</Button>
      </> : stk === "pending" ? <>
        <div className="glass-ios rounded-lg border border-border p-4 text-center">
          <Smartphone className="mx-auto mb-2 h-9 w-9 animate-pulse text-brand-violet motion-reduce:animate-none" />
          <h3 className="font-bold">{t("Demande STK simulée")}</h3>
          <p className="my-2 text-lg font-bold text-brand-violet">{amount} {currency}</p>
          <p className="break-words text-xs text-muted-foreground">{operator} · {phone}</p>
          <p className="mt-3 text-xs text-muted-foreground">{t("Aucune demande n'a été envoyée à votre téléphone. Ne saisissez aucun PIN réel.")}</p>
          <p className="mt-2 font-mono text-sm">{clock(Math.max(0, Math.ceil((stkDeadline - now) / 1000)))}</p>
        </div>
        <Button className="w-full bg-brand-green text-primary-foreground hover:bg-brand-green/90" onClick={() => setStk("accepted")}><CheckCircle2 />{t("Simuler l'acceptation")}</Button>
        <Button className="w-full" variant="outline" onClick={() => setStk("rejected")}><XCircle />{t("Simuler le refus")}</Button>
        <Button className="w-full" variant="ghost" onClick={() => setStk("expired")}>{t("Simuler l'expiration")}</Button>
      </> : <>
        <p role="status" className={`rounded-lg p-4 text-sm font-semibold ${stk === "accepted" ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red"}`}>{t(stk === "accepted" ? "Paiement fictif accepté. Aucun argent déplacé." : stk === "rejected" ? "Demande fictive refusée. Aucun débit." : "Demande fictive expirée. Aucun débit.")}</p>
        <Button variant="outline" className="w-full" onClick={() => setStk("form")}><RotateCcw />{t("Recommencer la simulation")}</Button>
      </>}
    </div> : <div className="space-y-4">
      {!code ? <Button disabled={!validPhone} className="w-full" onClick={newCode}><MessageSquare />{t("Créer le SMS fictif")}</Button> : <>
        <div className="glass-ios rounded-lg border border-border p-4">
          <p className="text-xs font-bold text-brand-violet">{t("SMS fictif · FILAX TEST")}</p>
          <p className="my-2 font-mono text-3xl font-bold" data-testid="simulated-otp">{code}</p>
          <p className="text-xs text-muted-foreground">{t("Ce code de démonstration ne permet ni connexion ni transaction réelle.")}</p>
          <p className="mt-2 text-xs">{t("Valable pendant")} {clock(remaining)}</p>
        </div>
        {verified ? <p role="status" className="text-sm font-semibold text-brand-green">{t("Code fictif validé. Aucune transaction autorisée.")}</p> : locked ? <p role="alert" className="text-sm font-semibold text-brand-red">{t("Trois codes incorrects : blocage fictif de 48 h. Aucun blocage de votre compte réel.")}</p> : <>
          <Field label={t("Code SMS à six chiffres")}><TextInput aria-label={t("Code SMS à six chiffres")} inputMode="numeric" autoComplete="off" maxLength={6} value={entered} onChange={e => setEntered(e.target.value.replace(/\D/g, "").slice(0, 6))} /></Field>
          {error && <p role="alert" className="text-xs font-semibold text-brand-red">{t(error)}</p>}
          {remaining === 0 && <p role="status" className="text-xs text-brand-red">{t("Code expiré. Créez un nouveau SMS fictif.")}</p>}
          <p className="text-xs text-muted-foreground">{t("Essais restants")} : {3 - attempts}</p>
          <Button className="w-full" disabled={entered.length !== 6 || remaining === 0} onClick={() => {
            if (Date.now() >= deadline) { setNow(Date.now()); setError("Code expiré. Créez un nouveau SMS fictif."); return; }
            if (entered === code) { setVerified(true); setError(""); }
            else { setAttempts(n => n + 1); setError("Code incorrect. Réessayez."); }
          }}>{t("Vérifier le code fictif")}</Button>
        </>}
        {!locked && !verified && <Button className="w-full" variant="outline" disabled={cooldown > 0} onClick={newCode}>{cooldown > 0 ? `${t("Renvoi dans")} ${clock(cooldown)}` : t("Renvoyer un code fictif")}</Button>}
        <Button className="w-full" variant="ghost" onClick={() => { setCode(""); setEntered(""); setAttempts(0); setVerified(false); setError(""); setDeadline(0); setResendAt(0); }}><RotateCcw />{t("Réinitialiser le test")}</Button>
      </>}
    </div>}
  </div>;
}

export function PaymentSimulationLauncher({ mode }: { mode: Mode }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return <>
    <Button type="button" variant="outline" className="w-full whitespace-normal border-brand-violet/30 text-brand-violet" onClick={() => setOpen(true)}><FlaskConical />{t(mode === "stk" ? "Simuler Mobile Money (STK)" : "Simuler un code SMS")}</Button>
    <Modal open={open} onOpenChange={setOpen} title={t("Simulations Mobile Money & SMS")}>
      {open && <SimulationContent initialMode={mode} />}
    </Modal>
  </>;
}