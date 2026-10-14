import { useState } from "react";
import { CheckCircle2, FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Modal, TextInput } from "./ui-kit";
import { useI18n } from "@/lib/i18n";

type Kind = "deposit" | "withdraw";
type Step = "amount" | "confirm" | "success";

// Deliberately isolated: fictional in-memory balance only. No financial, auth, persistence or messaging imports.
function DemoContent({ initialKind }: { initialKind: Kind }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [balance, setBalance] = useState(500);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("amount");
  const value = Number(amount.replace(",", "."));
  const valid = Number.isFinite(value) && value > 0 && (kind === "deposit" || value <= balance);
  const fmt = (n: number) => `${n.toFixed(2)} $`;

  return <div className="space-y-4">
    <p className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 p-3 text-xs font-semibold text-foreground">
      <FlaskConical className="mb-1 inline h-4 w-4 text-brand-gold" /> {t("DÉMO — solde fictif. Aucun argent réel, aucun compte réel modifié.")}
    </p>
    <div className="rounded-xl border border-border p-3 text-center">
      <p className="text-xs text-muted-foreground">{t("Solde fictif de démonstration")}</p>
      <p className="text-2xl font-bold" data-testid="demo-balance">{fmt(balance)}</p>
    </div>
    {step === "amount" && <>
      <div className="grid grid-cols-2 gap-2">
        {(["deposit", "withdraw"] as const).map(k => <Button key={k} variant={kind === k ? "secondary" : "ghost"} onClick={() => setKind(k)}>{t(k === "deposit" ? "Dépôt" : "Retrait")}</Button>)}
      </div>
      <Field label={t("Montant fictif")}><TextInput inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></Field>
      {kind === "withdraw" && value > balance && <p role="alert" className="text-xs font-semibold text-brand-red">{t("Montant supérieur au solde fictif.")}</p>}
      <Button className="w-full" disabled={!valid} onClick={() => setStep("confirm")}>{t("Continuer")}</Button>
    </>}
    {step === "confirm" && <>
      <p className="text-center text-sm">{t(kind === "deposit" ? "Confirmer le dépôt fictif de" : "Confirmer le retrait fictif de")} <b>{fmt(value)}</b> ?</p>
      <Button className="w-full" onClick={() => { setBalance(b => kind === "deposit" ? b + value : b - value); setStep("success"); }}>{t("Confirmer (démo)")}</Button>
      <Button className="w-full" variant="ghost" onClick={() => setStep("amount")}>{t("Retour")}</Button>
    </>}
    {step === "success" && <>
      <div role="status" className="rounded-lg bg-brand-green/10 p-4 text-center text-brand-green">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
        <p className="text-sm font-semibold">{t(kind === "deposit" ? "Dépôt fictif réussi" : "Retrait fictif réussi")} · {fmt(value)}</p>
      </div>
      <Button variant="outline" className="w-full" onClick={() => { setAmount(""); setStep("amount"); }}><RotateCcw />{t("Nouvelle opération démo")}</Button>
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
