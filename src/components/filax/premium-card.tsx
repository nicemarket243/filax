import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Lock, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { FilaxLogo } from "@/components/filax-logo";
import { Glyph } from "@/components/filax/glyph";
import { Button } from "@/components/ui/button";
import { themeImageFor } from "@/components/filax/account-theme";

import { accentVar } from "@/components/filax/ui-kit";
import { accountDisplayBalance, formatMoney, isLocked, type Account } from "@/lib/filax-store";
import { useI18n } from "@/lib/i18n";

interface Props {
  account: Account;
  index: number;
  total: number;
  onNext: () => void;
  onPrev?: () => void;
  onShowAll: () => void;
  onCreate: () => void;
  onChangeVisual: () => void;
}

/** Carte bancaire premium FILAX — une seule carte à la fois. */
export function PremiumCard({ account, index, total, onNext, onPrev, onShowAll, onCreate, onChangeVisual }: Props) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endVisualPress = () => { if (visualTimer.current) clearTimeout(visualTimer.current); };
  useEffect(() => () => { if (pressTimer.current) clearTimeout(pressTimer.current); if (visualTimer.current) clearTimeout(visualTimer.current); }, []);

  useEffect(() => setMounted(true), []);

  const locked = mounted && isLocked(account);
  const accent = accentVar(account.color);
  const themeImg = themeImageFor(account);

  const startPress = () => {
    pressTimer.current = setTimeout(onShowAll, 550);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  // Balayage horizontal fluide pour changer de compte
  const drag = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  const [dx, setDx] = useState(0);
  const [anim, setAnim] = useState(false);
  const onSwipeDown = (e: RPointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null };
    setAnim(false);
  };
  const onSwipeMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || total < 2) return;
    const mx = e.clientX - d.x, my = e.clientY - d.y;
    if (d.horizontal === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
      d.horizontal = Math.abs(mx) > Math.abs(my);
      if (d.horizontal) { endPress(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); }
    }
    if (d.horizontal) setDx(mx);
  };
  const onSwipeEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.horizontal) return;
    const w = 360;
    if (Math.abs(dx) > 60) {
      const dir = dx < 0 ? -1 : 1;
      setAnim(true);
      setDx(dir * w);
      setTimeout(() => {
        if (dir < 0) onNext(); else (onPrev ?? onNext)();
        setAnim(false);
        setDx(-dir * w * 0.6);
        requestAnimationFrame(() => requestAnimationFrame(() => { setAnim(true); setDx(0); }));
      }, 180);
    } else {
      setAnim(true);
      setDx(0);
    }
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
        onPointerDown={(e) => { startPress(); onSwipeDown(e); }}
        onPointerMove={onSwipeMove}
        onPointerUp={() => { endPress(); onSwipeEnd(); }}
        onPointerCancel={() => { endPress(); onSwipeEnd(); }}
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
          background: `linear-gradient(140deg, color-mix(in oklab, ${accent} 62%, var(--premium-base)) 0%, color-mix(in oklab, ${accent} 48%, var(--premium-base)) 42%, color-mix(in oklab, ${accent} 26%, var(--premium-deep)) 78%, var(--premium-base) 100%)`,
          boxShadow: `0 26px 60px -28px color-mix(in oklab, ${accent} 60%, #000), inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(0,0,0,.4)`,
          aspectRatio: "1.6 / 1",
          touchAction: "pan-y",
          transform: `translate3d(${dx}px,0,0) rotate(${dx / 60}deg)`,
          opacity: 1 - Math.min(Math.abs(dx) / 900, 0.35),
          transition: anim ? "transform 260ms cubic-bezier(.22,1,.36,1), opacity 260ms ease" : "none",
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
            <Button variant="ghost" aria-label={`Changer le visuel de ${account.name}`} title="Changer le visuel" onPointerDown={(e) => { e.stopPropagation(); endVisualPress(); visualTimer.current = setTimeout(onChangeVisual, 1000); }} onPointerUp={(e) => { e.stopPropagation(); endVisualPress(); }} onPointerLeave={endVisualPress} onPointerCancel={endVisualPress} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} onKeyDown={(e) => { e.stopPropagation(); }} onClick={(e) => { e.stopPropagation(); if (e.detail === 0) onChangeVisual(); }} onDoubleClick={(e) => e.stopPropagation()} className="flex h-10 w-10 shrink-0 touch-none items-center justify-center overflow-hidden rounded-2xl bg-white/15 p-0 ring-1 ring-white/20 backdrop-blur-md">
              {themeImg ? (
                <img
                  src={themeImg}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <Glyph icon={account.icon} className="h-[1.15rem] w-[1.15rem]" />
              )}
            </Button>
            <span className="leading-tight">
              <span className="block text-[0.82rem] font-bold tracking-tight">{account.name}</span>
              <span className="block text-[0.62rem] font-semibold tracking-[0.16em] text-white/70">{account.currency}</span>
            </span>
          </div>
          <FilaxLogo height={20} className="text-white opacity-90" />
        </div>




        {/* Solde total toujours visible ; le disponible reste contrôlé lors des opérations. */}
        <div className="relative">
          <p className="text-[2rem] font-extrabold leading-none tracking-tight">
            {formatMoney(accountDisplayBalance(account), account.currency)}
          </p>
          <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/70">
            {locked ? t("Solde inactif") : t("Solde actif")}
          </p>
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
