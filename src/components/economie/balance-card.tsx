import { useState } from "react";
import { Pencil, Lock, Check, Wifi } from "lucide-react";
import { type Account, formatMoney, isLocked, lockRemaining } from "./store";

interface BalanceCardProps {
  account: Account;
  onRename: (id: string, name: string) => void;
  onCycle: () => void;
  index: number;
  total: number;
}

const KIND_LABEL: Record<Account["kind"], string> = {
  principal: "Compte principal",
  secondaire: "Compte secondaire",
  verrouille: "Compte verrouillé",
};

export function BalanceCard({ account, onRename, onCycle, index, total }: BalanceCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(account.name);
  const locked = isLocked(account);

  const commit = () => {
    if (draft.trim()) onRename(account.id, draft.trim());
    else setDraft(account.name);
    setEditing(false);
  };

  return (
    <div
      onDoubleClick={onCycle}
      className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] transition-transform active:scale-[0.985] bg-gradient-to-br from-${account.color}/30 via-card to-card`}
    >
      {/* glass sheen */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className={`pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-${account.color}/20 blur-3xl`} />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg backdrop-blur">{account.icon}</span>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === "Enter" && commit()}
              className="w-32 rounded-lg border border-white/20 bg-black/30 px-2 py-1 text-sm font-semibold text-foreground outline-none"
            />
          ) : (
            <button onClick={() => setEditing(true)} className="group flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground">{account.name}</span>
              {editing ? null : <Pencil className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />}
            </button>
          )}
        </div>
        {editing ? (
          <button onClick={commit} className="text-brand-green">
            <Check className="h-4 w-4" />
          </button>
        ) : (
          <Wifi className="h-4 w-4 rotate-90 text-white/40" />
        )}
      </div>

      <div className="relative mt-7">
        <p className="text-[0.66rem] uppercase tracking-widest text-muted-foreground">Solde disponible</p>
        <p className="mt-1 text-[2.1rem] font-extrabold leading-none tracking-tight text-foreground">
          {formatMoney(account.balance, account.currency)}
        </p>
      </div>

      <div className="relative mt-6 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
          {locked && <Lock className="h-3 w-3 text-brand-violet" />}
          {KIND_LABEL[account.kind]}
          {locked && account.lockedUntil && (
            <span className="text-brand-violet"> · {lockRemaining(account.lockedUntil)}</span>
          )}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-foreground" : "w-1.5 bg-white/25"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
