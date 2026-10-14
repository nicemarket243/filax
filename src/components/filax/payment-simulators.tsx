import { useState } from "react";
import { CheckCircle2, FlaskConical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Modal, TextInput } from "./ui-kit";
import { useI18n } from "@/lib/i18n";

type Kind = "deposit" | "withdraw";
type Step = "form" | "confirm" | "pin" | "success";

// Fictional demo operators per country (labels only, nothing is contacted).
const DEMO_OPERATORS: Record<string, { label: string; ops: string[] }> = {
  CD: { label: "RD Congo", ops: ["M-Pesa", "Orange Money", "Airtel Money", "Afrimoney"] },
  BJ: { label: "Bénin", ops: ["MTN MoMo", "Moov Money"] },
  CI: { label: "Côte d'Ivoire", ops: ["Orange Money", "MTN MoMo", "Moov Money", "Wave"] },
  SN: { label: "Sénégal", ops: ["Orange Money", "Wave", "Free Money"] },
  CM: { label: "Cameroun", ops: ["MTN MoMo", "Orange Money"] },
  KE: { label: "Kenya", ops: ["M-Pesa", "Airtel Money"] },
};
const DEMO_PIN = "1234";

// Deliberately isolated: fictional in-memory state only. No financial, auth, persistence or messaging imports.
function DemoContent({ initialKind }: { initialKind: Kind }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [balance, setBalance] = useState(500);
  const [country, setCountry] = useState("CD");
  const [operator, setOperator] = useState("M-Pesa");
  const [numbers, setNumbers] = useState<string[]>(["+243 000 000 001"]);
  const [phone, setPhone] = useState("+243 000 000 001");
  const [newNumber, setNewNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const value = Number(amount.replace(",", "."));
  const tooMuch = kind === "withdraw" && value > balance;
  const valid = Number.isFinite(value) && value > 0 && !tooMuch && !!phone && !!operator;
  const fmt = (n: number) => `${n.toFixed(2)} $`;
  const ops = DEMO_OPERATORS[country]?.ops ?? [];

  const pickCountry = (c: string) => { setCountry(c); setOperator(DEMO_OPERATORS[c]?.ops[0] ?? ""); };
  const addNumber = () => {
    const n = newNumber.trim();
    if (!/^\+?[\d\s]{8,18}$/.test(n) || numbers.includes(n)) return;
    setNumbers(l => [...l, n]); setPhone(n); setNewNumber("");
  };
  const removeNumber = (n: string) => { setNumbers(l => l.filter(x => x !== n)); if (phone === n) setPhone(""); };
  const apply = () => { setBalance(b => kind === "deposit" ? b + value : b - value); setStep("success"); };

  return <div className="space-y-4">
    <p className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 p-3 text-xs font-semibold text-foreground">
      <FlaskConical className="mb-1 inline h-4 w-4 text-brand-gold" /> {t("DÉMO — solde fictif. Aucun argent réel, aucun compte réel modifié.")}
    </p>
    <div className="rounded-xl border border-border p-3 text-center">
      <p className="text-xs text-muted-foreground">{t("Solde fictif de démonstration")}</p>
      <p className="text-2xl font-bold" data-testid="demo-balance">{fmt(balance)}</p>
    </div>

    {step === "form" && <>
      <div className="grid grid-cols-2 gap-2">
        {(["deposit", "withdraw"] as const).map(k => <Button key={k} variant={kind === k ? "secondary" : "ghost"} onClick={() => setKind(k)}>{t(k === "deposit" ? "Dépôt" : "Retrait")}</Button>)}
      </div>
      <Field label={t("Pays (démo)")}>
        <select aria-label={t("Pays (démo)")} value={country} onChange={e => pickCountry(e.target.value)} className="h-11 w-full rounded-lg border border-input bg-background p-2 text-sm">
          {Object.entries(DEMO_OPERATORS).map(([c, v]) => <option key={c} value={c}>{t(v.label)}</option>)}
        </select>
      </Field>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("Opérateur fictif")}>
        {ops.map(o => <Button key={o} size="sm" role="radio" aria-checked={operator === o} variant={operator === o ? "secondary" : "outline"} onClick={() => setOperator(o)}>{o}</Button>)}
      </div>
      <Field label={t("Numéro fictif")}>
        <div className="space-y-2">
          {numbers.map(n => <div key={n} className="flex items-center gap-2">
            <Button size="sm" className="flex-1 justify-start" variant={phone === n ? "secondary" : "ghost"} onClick={() => setPhone(n)}>{n}</Button>
            <Button size="icon" variant="ghost" aria-label={`${t("Supprimer")} ${n}`} onClick={() => removeNumber(n)}><Trash2 className="h-4 w-4" /></Button>
          </div>)}
          <div className="flex gap-2">
            <TextInput aria-label={t("Nouveau numéro fictif")} type="tel" value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="+243 ..." autoComplete="off" />
            <Button size="icon" variant="outline" aria-label={t("Ajouter le numéro")} onClick={addNumber}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      </Field>
      <Field label={t("Montant fictif")}><TextInput aria-label={t("Montant fictif")} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></Field>
      {tooMuch && <p role="alert" className="text-xs font-semibold text-brand-red">{t("Montant supérieur au solde fictif.")}</p>}
      <Button className="w-full" disabled={!valid} onClick={() => setStep("confirm")}>{t("Continuer")}</Button>
    </>}

    {step === "confirm" && <>
      <p className="text-center text-sm">{t(kind === "deposit" ? "Confirmer le dépôt fictif de" : "Confirmer le retrait fictif de")} <b>{fmt(value)}</b> · {operator} · {phone}</p>
      {kind === "deposit" && <p className="text-center text-xs text-muted-foreground">{t("Aucun code n'est demandé en démo. Ne saisissez jamais de vrai code opérateur.")}</p>}
      <Button className="w-full" onClick={() => kind === "deposit" ? apply() : (setPin(""), setPinError(false), setStep("pin"))}>{t("Confirmer (démo)")}</Button>
      <Button className="w-full" variant="ghost" onClick={() => setStep("form")}>{t("Retour")}</Button>
    </>}

    {step === "pin" && <>
      <Field label={t("PIN de démo (4 chiffres)")}>
        <TextInput aria-label={t("PIN de démo (4 chiffres)")} type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(false); }} className="text-center tracking-[0.5em]" />
      </Field>
      <p className="text-center text-xs text-muted-foreground">{t("PIN fictif de la démo : 1234. Ce n'est pas votre PIN FILAX.")}</p>
      {pinError && <p role="alert" className="text-center text-xs font-semibold text-brand-red">{t("PIN de démo incorrect.")}</p>}
      <Button className="w-full" disabled={pin.length !== 4} onClick={() => pin === DEMO_PIN ? apply() : setPinError(true)}>{t("Valider (démo)")}</Button>
      <Button className="w-full" variant="ghost" onClick={() => setStep("confirm")}>{t("Retour")}</Button>
    </>}

    {step === "success" && <>
      <div role="status" className="rounded-lg bg-brand-green/10 p-4 text-center text-brand-green">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
        <p className="text-sm font-semibold">{t(kind === "deposit" ? "Dépôt fictif réussi" : "Retrait fictif réussi")} · {fmt(value)}</p>
      </div>
      <Button variant="outline" className="w-full" onClick={() => { setAmount(""); setStep("form"); }}><RotateCcw />{t("Nouvelle opération démo")}</Button>
    </>}
  </div>;
}

export function TransactionDemoLauncher({ kind }: { kind: Kind }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return <>
    <button type="button" className="press flex w-full items-center justify-center gap-1.5 text-[0.7rem] font-semibold text-muted-foreground underline-offset-2 hover:underline" onClick={() => setOpen(true)}>
      <FlaskConical className="h-3.5 w-3.5" />{t("Essayer en mode démo (solde fictif)")}
    </button>
    <Modal open={open} onOpenChange={setOpen} title={t("Démo — Dépôt & Retrait")}>
      {open && <DemoContent initialKind={kind} />}
    </Modal>
  </>;
}
