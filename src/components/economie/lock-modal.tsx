import { useState } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Account, LOCK_DURATIONS, formatDate } from "./store";

interface LockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onConfirm: (accountId: string, until: number) => void;
}

export function LockModal({ open, onOpenChange, account, onConfirm }: LockModalProps) {
  const [days, setDays] = useState(30);
  const [confirming, setConfirming] = useState(false);

  if (!account) return null;
  const until = Date.now() + days * 86_400_000;

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(() => setConfirming(false), 200);
  };

  const apply = () => {
    onConfirm(account.id, until);
    toast.success(`${account.name} verrouillé jusqu'au ${formatDate(until)}`);
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-white/10 bg-card/95 p-0 backdrop-blur-2xl">
        <div className="bg-gradient-to-b from-brand-violet/15 to-transparent px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand-violet" /> Bloquer mes fonds
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6">
          {!confirming ? (
            <div className="space-y-4 animate-fade-up">
              <p className="text-[0.78rem] text-muted-foreground">
                Verrouillez <span className="font-semibold text-foreground">{account.icon} {account.name}</span> pour résister à la tentation de dépenser.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {LOCK_DURATIONS.map((d) => (
                  <button
                    key={d.days}
                    onClick={() => setDays(d.days)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                      days === d.days ? "border-brand-violet/60 bg-brand-violet/15 text-foreground" : "border-white/10 bg-white/[0.03] text-muted-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <Button onClick={() => setConfirming(true)} className="w-full rounded-2xl bg-brand-violet py-6 font-bold text-white hover:bg-brand-violet/90">
                Continuer
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2 text-center animate-fade-up">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-violet/15">
                <AlertTriangle className="h-7 w-7 text-brand-gold" />
              </div>
              <h3 className="text-base font-bold text-foreground">Confirmez-vous le verrouillage ?</h3>
              <p className="text-[0.78rem] text-muted-foreground">
                Fin du blocage : <span className="font-semibold text-foreground">{formatDate(until)}</span>
              </p>
              <p className="rounded-xl bg-brand-red/10 px-3 py-2 text-[0.7rem] text-brand-red">
                Cette décision est irréversible jusqu'à échéance.
              </p>
              <div className="grid w-full grid-cols-2 gap-2 pt-2">
                <Button variant="outline" onClick={() => setConfirming(false)} className="rounded-2xl border-white/15 bg-transparent">
                  Annuler
                </Button>
                <Button onClick={apply} className="rounded-2xl bg-brand-violet font-bold text-white hover:bg-brand-violet/90">
                  Verrouiller
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
