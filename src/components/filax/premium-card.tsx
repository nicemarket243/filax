import { useEffect, useRef, useState } from "react";
import { Lock, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { FilaxLogo } from "@/components/filax-logo";
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

/** Carte bancaire premium FILAX — une seule carte à la fois. */
export function PremiumCard({ account, index, total, onNext, onShowAll, onCreate }: Props) {
  const [mounted, setMounted] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const locked = mounted && isLocked(account);
  const progress = account.target ? pct(account.balance, account.target) : null;
  const accent = accentVar(account.color);

  const startPress = () => {
    pressTimer.current = setTimeout(onShowAll, 550);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div className="relative">
      <article
        role="button"
        tabIndex={0}
        aria-label={`${account.name} — carte du compte`}
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
          if (e.key === "Enter" && total > 1) onNext();
        }}
        className="press card-sheen relative flex w-full select-none flex-col justify-between overflow-hidden rounded-[1.6rem] p-5 text-white"
        style={{
          background: `linear-gradient(140deg, color-mix(in oklab, ${accent} 62%, #05070f) 0%, color-mix(in oklab, ${accent} 48%, #05070f) 42%, color-mix(in oklab, ${accent} 26%, #04060d) 78%, #05070f 100%)`,
          boxShadow: `0 26px 60px -28px color-mix(in oklab, ${accent} 60%, #000), inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(0,0,0,.4)`,
          aspectRatio: "1.6 / 1",
        }}
      >
        {/* reflets premium */}
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full opacity-[0.14]"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 68%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ background: "linear-gradient(115deg, transparent 38%, #fff 48%, transparent 58%)" }}
        />

        {/* Ligne du haut : identité du compte à gauche, logo FILAX à droite */}
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
              <Glyph icon={account.icon} className="h-[1.15rem] w-[1.15rem]" />
            </span>
            <span className="leading-tight">
              <span className="block text-[0.82rem] font-bold tracking-tight">{account.name}</span>
              <span className="block text-[0.62rem] font-semibold tracking-[0.16em] text-white/70">{account.currency}</span>
            </span>
          </div>
          <FilaxLogo height={20} className="text-white opacity-90" />
        </div>


        {/* Solde */}
        <div className="relative">
          <p className="text-[2rem] font-extrabold leading-none tracking-tight">
            {formatMoney(account.balance, account.currency)}
          </p>
          <p className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-white/60">Solde disponible</p>

          {progress !== null && (
            <div className="mt-2.5">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-[0.58rem] text-white/70">
                {progress}% de {formatMoney(account.target ?? 0, account.currency)}
              </p>
            </div>
          )}
        </div>

        {/* Statut + bouton créer un compte */}
        <div className="relative flex items-center justify-between">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6rem] font-bold backdrop-blur-md ${
              locked ? "bg-black/30 text-white/80" : "bg-white/20 text-white"
            }`}
          >
            {locked ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
            {locked ? "Compte verrouillé" : "Compte actif"}
          </span>
          <button
            type="button"
            aria-label="Créer un nouveau compte"
            onClick={(e) => {
              e.stopPropagation();
              onCreate();
            }}
            className="press flex h-8 items-center gap-1 rounded-full bg-white/20 px-3 text-[0.6rem] font-bold text-white backdrop-blur-md"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </article>

      {total > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 18 : 6,
                backgroundColor: i === index ? "var(--brand-blue)" : "var(--muted)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function lockedWithdrawToast() {
  toast.error("Impossible d'effectuer un retrait sur un compte verrouillé.");
}
