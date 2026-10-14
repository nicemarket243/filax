import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Field, Modal, PrimaryButton, TextInput } from "@/components/filax/ui-kit";
import { hasDbPin, setDbPin } from "@/lib/filax-db";

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

/** Fenêtre sécurisée : code PIN personnel à 4 chiffres requis pour chaque retrait ou transfert. */
export function PinConfirmModal({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (pin: string) => Promise<void>;
}) {
  const [step, setStep] = useState<"loading" | "create" | "enter">("loading");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPin(""); setConfirm(""); setStep("loading");
    let alive = true;
    void hasDbPin().then((ok) => alive && setStep(ok ? "enter" : "create"));
    return () => { alive = false; };
  }, [open]);

  const create = async () => {
    if (pin !== confirm) return void toast.error("Les deux codes ne correspondent pas");
    setBusy(true);
    try { await setDbPin(pin); toast.success("Code PIN créé"); setPin(""); setConfirm(""); setStep("enter"); }
    catch (e) { toast.error("Code PIN non enregistré", { description: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    setBusy(true);
    try { await onSubmit(pin); } finally { setBusy(false); setPin(""); }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Confirmation sécurisée" subtitle={step === "create" ? "Créez votre code PIN personnel à 4 chiffres" : "Insérez votre code PIN de quatre chiffres pour confirmer cette transaction."}>
      <div className="space-y-4">
        <div className="flex justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"><Lock className="h-5 w-5" /></span></div>
        {step === "loading" && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {step === "create" && (
          <>
            <Field label="Nouveau code PIN"><TextInput type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} placeholder="••••" value={pin} onChange={(e) => setPin(digits(e.target.value))} /></Field>
            <Field label="Confirmez le code PIN"><TextInput type="password" inputMode="numeric" autoComplete="new-password" maxLength={4} placeholder="••••" value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} /></Field>
            <PrimaryButton disabled={busy || pin.length !== 4 || confirm.length !== 4} onClick={create}>Créer mon code PIN</PrimaryButton>
          </>
        )}
        {step === "enter" && (
          <>
            <Field label="Code PIN (4 chiffres)"><TextInput autoFocus type="password" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={pin} onChange={(e) => setPin(digits(e.target.value))} className="text-center text-lg tracking-[0.5em]" /></Field>
            <PrimaryButton disabled={busy || pin.length !== 4} onClick={submit}>{busy ? "Traitement…" : "Valider l'opération"}</PrimaryButton>
            <p className="text-center text-[0.65rem] text-muted-foreground">Ce code est indépendant du code reçu par SMS ou e-mail.</p>
          </>
        )}
      </div>
    </Modal>
  );
}
