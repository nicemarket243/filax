import { Lock, ShieldCheck } from "lucide-react";
import { Modal, accentVar } from "@/components/filax/ui-kit";
import { formatMoney, isLocked, type Account } from "@/lib/filax-store";

export function AllAccountsModal({
  open,
  onOpenChange,
  accounts,
  activeId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accounts: Account[];
  activeId: string;
  onSelect: (index: number) => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Tous les comptes" subtitle="Sélectionnez le compte à afficher">
      <div className="space-y-2">
        {accounts.map((a, i) => {
          const locked = isLocked(a);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onSelect(i);
                onOpenChange(false);
              }}
              className={`press flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${
                a.id === activeId ? "bg-brand-blue/10" : "bg-muted/60"
              }`}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-base text-white"
                style={{ backgroundColor: accentVar(a.color) }}
              >
                {a.icon}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[0.8rem] font-bold text-foreground">{a.name}</span>
                <span className="flex items-center gap-1 text-[0.62rem] text-muted-foreground">
                  N°{String(i + 1).padStart(3, "0")} ·{" "}
                  {locked ? (
                    <>
                      <Lock className="h-3 w-3" /> Verrouillé
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3 w-3" /> Actif
                    </>
                  )}
                </span>
              </span>
              <span className="text-[0.8rem] font-extrabold text-foreground">{formatMoney(a.balance, a.currency)}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
