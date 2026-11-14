import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import useEmblaCarousel from "embla-carousel-react";
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
  accounts: Account[];
  index: number;
  onIndexChange: (index: number) => void;
  onShowAll: () => void;
  onCreate: () => void;
  onChangeVisual: () => void;
}

interface CardFaceProps {
  account: Account;
  mounted: boolean;
  onShowAll: () => void;
  onCreate: () => void;
  onChangeVisual: () => void;
  onNext: () => void;
  canSwipe: boolean;
}

/** Une face de carte ; le défilement physique entre faces est confié à Embla. */
function CardFace({ account, mounted, onShowAll, onCreate, onChangeVisual, onNext, canSwipe }: CardFaceProps) {
  const { t } = useI18n();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const locked = mounted && isLocked(account);
  const accent = accentVar(account.color);
  const themeImg = themeImageFor(account);

  const endPress = useCallback(() => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }, []);
  const endVisualPress = () => {
    if (visualTimer.current) clearTimeout(visualTimer.current);
    visualTimer.current = null;
  };
  useEffect(() => () => { endPress(); endVisualPress(); }, [endPress]);

  const startPress = (e: RPointerEvent) => {
    if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    endPress();
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      pressOrigin.current = null;
      onShowAll();
    }, 550);
  };
  const movePress = (e: RPointerEvent) => {
    const origin = pressOrigin.current;
    if (origin && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 8) {
      pressOrigin.current = null;
      endPress();
    }
  };
  const finishPress = () => {
    pressOrigin.current = null;
    endPress();
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${account.name} — carte du compte`}
      onDoubleClick={() => { if (canSwipe) onNext(); }}
      onPointerDown={startPress}
      onPointerMove={movePress}
      onPointerUp={finishPress}
      onPointerCancel={finishPress}
      onPointerLeave={finishPress}
      onContextMenu={(e) => {
        e.preventDefault();
        onShowAll();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && canSwipe) onNext();
      }}
      className="press card-sheen relative flex w-full select-none flex-col justify-between overflow-hidden rounded-[1.6rem] p-5 text-white"
      style={{
        background: `linear-gradient(140deg, color-mix(in oklab, ${accent} 62%, var(--premium-base)) 0%, color-mix(in oklab, ${accent} 48%, var(--premium-base)) 42%, color-mix(in oklab, ${accent} 26%, var(--premium-deep)) 78%, var(--premium-base) 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(0,0,0,.4)`,
        aspectRatio: "1.6 / 1",
        backfaceVisibility: "hidden",
      }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full opacity-[0.14]"
        style={{ background: "radial-gradient(circle, #fff 0%, transparent 68%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ background: "linear-gradient(115deg, transparent 38%, #fff 48%, transparent 58%)" }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" aria-label={`Changer le visuel de ${account.name}`} title="Changer le visuel" onPointerDown={(e) => { e.stopPropagation(); endVisualPress(); visualTimer.current = setTimeout(onChangeVisual, 1000); }} onPointerUp={(e) => { e.stopPropagation(); endVisualPress(); }} onPointerLeave={endVisualPress} onPointerCancel={endVisualPress} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} onKeyDown={(e) => { e.stopPropagation(); }} onClick={(e) => { e.stopPropagation(); if (e.detail === 0) onChangeVisual(); }} onDoubleClick={(e) => e.stopPropagation()} className="flex h-10 w-10 shrink-0 touch-none items-center justify-center overflow-hidden rounded-2xl bg-white/15 p-0 ring-1 ring-white/20 backdrop-blur-md">
            {themeImg ? (
              <img src={themeImg} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
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

      <div className="relative">
        <p className="text-[2rem] font-extrabold leading-none tracking-tight">
          {formatMoney(accountDisplayBalance(account), account.currency)}
        </p>
        <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/70">
          {locked ? t("Solde inactif") : t("Solde actif")}
        </p>
      </div>

      <div className="relative flex items-center justify-between">
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6rem] font-bold backdrop-blur-md ${locked ? "bg-black/30 text-white/80" : "bg-white/20 text-white"}`}>
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
  );
}

/** Carrousel natif, magnétique et fluide : une seule carte est retenue à chaque arrêt. */
export function PremiumCard({ accounts, index, onIndexChange, onShowAll, onCreate, onChangeVisual }: Props) {
  const [mounted, setMounted] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: accounts.length > 1,
    skipSnaps: false,
    duration: 34,
    startIndex: index,
  });
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!emblaApi) return;
    const select = () => onIndexChange(emblaApi.selectedScrollSnap());
    emblaApi.on("select", select).on("reInit", select);
    select();
    return () => {
      emblaApi.off("select", select).off("reInit", select);
    };
  }, [emblaApi, onIndexChange]);

  useEffect(() => {
    if (emblaApi && emblaApi.selectedScrollSnap() !== index) emblaApi.scrollTo(index);
  }, [emblaApi, index]);

  return (
    <div>
      <div
        ref={emblaRef}
        className="overflow-hidden"
        aria-roledescription="carrousel"
        aria-label="Comptes FILAX"
      >
        <div className="flex touch-pan-y">
          {accounts.map((account) => (
            <div key={account.id} className="min-w-0 flex-[0_0_100%]" aria-roledescription="diapositive">
              <CardFace
                account={account}
                mounted={mounted}
                onShowAll={onShowAll}
                onCreate={onCreate}
                onChangeVisual={onChangeVisual}
                onNext={() => emblaApi?.scrollNext()}
                canSwipe={accounts.length > 1}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function lockedWithdrawToast() {
  toast.error("Impossible d'effectuer un retrait sur un compte verrouillé.");
}
