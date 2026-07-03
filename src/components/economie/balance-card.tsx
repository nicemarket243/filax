import { useState } from "react";
import { Pencil, Lock, Check } from "lucide-react";
import { FilaxLogo } from "@/components/filax-logo";
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

/**
 * Carte bancaire premium FILAX — fine, légère, ombres douces.
 * Photo de l'objet du compte + nom (petit) en haut, logo FILAX en haut à droite,
 * solde en gros au centre, crayon d'édition à côté du nom.
 */
export function BalanceCard({ account, onRename, onCycle, index, total }: BalanceCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(account.name);
  const locked = isLocked(account);

  const commit = () => {
    if (draft.trim()) onRename(account.id, draft.trim());
    else setDraft(account.name);
    setEditing(false);
  };

  const tint = `var(--${account.color})`;

  return (
    <div
      onDoubleClick={onCycle}
      style={{
        background: `linear-gradient(135deg, color-mix(in oklch, ${tint} 16%, var(--card)) 0%, color-mix(in oklch, ${tint} 6%, var(--card)) 55%, var(--card) 100%)`,
      }}
      className="relative mx-auto aspect-[1.7/1] w-full max-w-[340px] overflow-hidden rounded-[1.5rem] p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] transition-transform active:scale-[0.985]"
    >
      {/* reflets verre */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/[0.07] blur-3xl" />
      <div
        style={{ background: `color-mix(in oklch, ${tint} 22%, transparent)` }}
        className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full blur-3xl"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.06]" />

      {/* Haut : icône objet + nom (petit) à gauche · logo FILAX à droite */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">
            {account.icon}
          </span>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === "Enter" && commit()}
              className="w-28 rounded-md border border-white/20 bg-black/40 px-2 py-0.5 text-[0.72rem] font-medium text-foreground outline-none"
            />
          ) : (
            <button onClick={() => setEditing(true)} className="group flex items-center gap-1">
              <span className="text-[0.74rem] font-medium tracking-tight text-foreground/90">{account.name}</span>
              <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100" />
            </button>
          )}
        </div>
        {editing ? (
          <button onClick={commit} className="text-brand-green">
            <Check className="h-4 w-4" />
          </button>
        ) : (
          <FilaxLogo height={14} className="opacity-90" />
        )}
      </div>

      {/* puce + sans-contact */}
      <div className="relative mt-3 flex items-center gap-2">
        <span className="h-5 w-7 rounded-[4px] bg-gradient-to-br from-brand-gold/80 to-brand-gold/40 shadow-inner" />
        <svg width="14" height="14" viewBox="0 0 24 24" className="text-white/40">
          <path d="M5 8a10 10 0 0114 0M8 11a6 6 0 018 0M11 14a2 2 0 012 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>

      {/* Solde en gros */}
      <div className="relative mt-3">
        <p className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Solde disponible</p>
        <p className="mt-0.5 text-[2rem] font-extrabold leading-none tracking-tight text-foreground">
          {formatMoney(account.balance, account.currency)}
        </p>
      </div>

      {/* Bas : type de compte + indicateur de page */}
      <div className="relative mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[0.64rem] text-muted-foreground">
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
