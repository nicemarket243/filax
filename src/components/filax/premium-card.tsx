import { useEffect, useRef, useState } from "react";
import { Lock, Plus, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";

import { accentVar } from "@/components/filax/ui-kit";
import { formatMoney, isLocked, pct, type Account } from "@/lib/filax-store";

interface Props {
  account: Account;
  index: number;
  total: number;
  onNext: () => void;
  onShowAll: () => void;
  onCreate: () => void;
}

/** Carte bancaire premium — une seule à la fois. Double-clic = compte suivant, appui long = tous les comptes. */
export function PremiumCard({ account, index, total, onNext, onShowAll, onCreate }: Props) {
  const [mounted, setMounted] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  useEffect(() => setMounted(true), []);

  const locked = mounted && isLocked(account);
  const progress = account.target ? pct(account.balance, account.target) : null;
  const accent = accentVar(account.color);
  const number = `N°${String(index + 1).padStart(3, "0")}`;

  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onShowAll();
    }, 550);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div className="relative">
      <article
        role="button"
        tabIndex={0}
        aria-label={`${account.name}, double-cliquez pour le compte suivant`}
        onDoubleClick={() => {
          if (total > 1) onNext();
        }}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onContextMenu={(e) => {
          e.preventDefault();
          onShowAll();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onNext();
        }}
        className="press relative w-full select-none overflow-hidden rounded-[1.75rem] p-5 text-white"
        style={{
          background: `linear-gradient(145deg, ${accent} 0%, color-mix(in oklab, ${accent} 55%, #05070f) 100%)`,
          boxShadow: `0 26px 60px -28px color-mix(in oklab, ${accent} 70%, transparent), inset 0 1px 0 rgba(255,255,255,.35)`,
          aspectRatio: "1.62 / 1",
        }}
      >
        <div
          className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 68%)" }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-20"
          style={{ background: "linear-gradient(180deg, transparent, #fff)" }}
        />

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/22 text-lg backdrop-blur-md">
              {account.icon}
            </span>
          </div>
          <div className="text-right leading-tight">
            <p className="text-[0.8rem] font-bold tracking-tight">{account.name}</p>
            <p className="text-[0.62rem] font-medium text-white/65">{number}</p>
          </div>
        </div>

        <div className="relative mt-6">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/60">Solde disponible</p>
          <p className="mt-1 text-[2.1rem] font-extrabold leading-none tracking-tight">
            {formatMoney(account.balance, account.currency)}
          </p>
        </div>

        {progress !== null && (
          <div className="relative mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-[0.6rem] text-white/75">
              {progress}% de {formatMoney(account.target ?? 0, account.currency)}
            </p>
          </div>
        )}

        <div className="relative mt-4 flex items-center justify-between">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-bold backdrop-blur-md ${
              locked ? "bg-black/30 text-white/85" : "bg-white/22"
            }`}
          >
            {locked ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
            {locked ? "Compte Verrouillé" : "Compte Actif"}
          </span>
          <span className="text-[0.58rem] font-medium text-white/60">
            {index + 1}/{total} · double-clic
          </span>
        </div>
      </article>

      <button
        type="button"
        aria-label="Créer un compte"
        onClick={onCreate}
        className="press absolute -bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-brand-blue soft-shadow"
      >
        <Plus className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onShowAll}
        className="press mt-6 flex w-full items-center justify-center gap-1.5 text-[0.7rem] font-semibold text-brand-blue"
      >
        <Wallet className="h-3.5 w-3.5" /> Voir tous les comptes
      </button>
    </div>
  );
}

export function lockedWithdrawToast() {
  toast.error("Impossible d'effectuer un retrait sur un compte verrouillé.");
}
