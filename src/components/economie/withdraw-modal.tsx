import { useState } from "react";
import { Loader2, CheckCircle2, ShieldAlert, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Account, type TxMethod, formatMoney, isLocked, lockRemaining } from "./store";

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  defaultAccountId: string;
  onConfirm: (accountId: string, amount: number, method: TxMethod) => void;
}

type Stage = "form" | "processing" | "done";

export function WithdrawModal({ open, onOpenChange, accounts, defaultAccountId, onConfirm }: WithdrawModalProps) {
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [amount, setAmount] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [stage, setStage] = useState<Stage>("form");

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const locked = isLocked(account);
  const numAmount = parseFloat(amount.replace(",", ".")) || 0;

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o)
      setTimeout(() => {
        setStage("form");
        setAmount("");
        setBeneficiary("");
      }, 200);
  };

  const submit = () => {
    if (locked) return;
    if (numAmount <= 0) return toast.error("Montant invalide.");
    if (numAmount > account.balance) return toast.error("Solde insuffisant.");
    if (beneficiary.replace(/\D/g, "").length < 8) return toast.error("Numéro bénéficiaire invalide.");
    setStage("processing");
    setTimeout(() => {
      onConfirm(accountId, numAmount, "mobile");
      setStage("done");
      toast.success(`Retrait de ${formatMoney(numAmount, account.currency)} effectué`);
    }, 1800);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-white/10 bg-card/95 p-0 backdrop-blur-2xl">
        <div className="bg-gradient-to-b from-brand-red/15 to-transparent px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Retrait</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {stage === "done" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center animate-fade-up">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-red/15">
                <CheckCircle2 className="h-8 w-8 text-brand-red" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Retrait effectué</h3>
              <p className="text-2xl font-extrabold text-brand-red">−{formatMoney(numAmount, account.currency)}</p>
              <p className="text-xs text-muted-foreground">Envoyé à {beneficiary}</p>
              <Button onClick={() => close(false)} className="w-full rounded-2xl bg-brand-red text-white hover:bg-brand-red/90">
                Terminer
              </Button>
            </div>
          ) : stage === "processing" ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-brand-red" />
              <p className="text-sm font-semibold text-foreground">Traitement du retrait…</p>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-up">
              <div className="space-y-1.5">
                <Label className="text-[0.72rem] text-muted-foreground">Compte source</Label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-foreground outline-none focus:border-brand-red/50"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id} className="bg-card">
                      {a.icon} {a.name} · {formatMoney(a.balance, a.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {locked ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand-red/30 bg-brand-red/10 p-5 text-center">
                  <Lock className="h-7 w-7 text-brand-red" />
                  <p className="text-sm font-bold text-foreground">Fonds verrouillés</p>
                  <p className="text-[0.72rem] text-muted-foreground">
                    Retrait disponible dans {account.lockedUntil ? lockRemaining(account.lockedUntil) : ""}.
                  </p>
                  <p className="text-[0.66rem] text-brand-red">Aucun contournement possible.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-[0.72rem] text-muted-foreground">Montant ({account.currency})</Label>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[0.72rem] text-muted-foreground">Numéro bénéficiaire</Label>
                    <Input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="+243 ..." inputMode="tel" />
                  </div>
                </>
              )}

              <Button
                onClick={submit}
                disabled={locked}
                className="mt-2 w-full rounded-2xl py-6 text-base font-bold disabled:opacity-40 bg-brand-red text-white hover:bg-brand-red/90"
              >
                {locked ? "Indisponible" : "Confirmer le retrait"}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-[0.62rem] text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-brand-red" /> Opération enregistrée de façon permanente
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
