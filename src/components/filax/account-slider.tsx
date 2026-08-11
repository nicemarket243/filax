import { Lock } from "lucide-react";
import { formatMoney, isLocked, pct, type Account } from "@/lib/filax-store";
import { accentVar } from "@/components/filax/ui-kit";

interface Props {
  accounts: Account[];
  activeIndex: number;
  onActiveChange: (i: number) => void;
}

/** Slider horizontal (glissement) de cartes bancaires premium. */
export function AccountSlider({ accounts, activeIndex, onActiveChange }: Props) {
  return (
    <div>
      <div
        className="card-rail -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          const child = el.firstElementChild as HTMLElement | null;
          if (!child) return;
          const w = child.offsetWidth + 12;
          const i = Math.round(el.scrollLeft / w);
          if (i !== activeIndex && i >= 0 && i < accounts.length) onActiveChange(i);
        }}
      >
        {accounts.map((a) => {
          const locked = isLocked(a);
          const progress = a.target ? pct(a.balance, a.target) : null;
          return (
            <article
              key={a.id}
              className="card-snap soft-shadow relative w-[84%] shrink-0 overflow-hidden rounded-3xl p-5 text-white"
              style={{
                background: `linear-gradient(145deg, ${accentVar(a.color)} 0%, color-mix(in oklab, ${accentVar(a.color)} 62%, #0b1020) 100%)`,
              }}
            >
              <div
                className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full opacity-25"
                style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
              />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-base">{a.icon}</span>
                  <div className="leading-tight">
                    <p className="text-[0.72rem] font-semibold text-white/85">{a.name}</p>
                    <p className="text-[0.62rem] text-white/60">{a.currency}</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.58rem] font-bold">
                  {locked ? "Bloqué" : "Actif"}
                </span>
              </div>

              <p className="mt-6 text-[2rem] font-extrabold leading-none tracking-tight">
                {formatMoney(a.balance, a.currency)}
              </p>

              {progress !== null ? (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-[0.62rem] text-white/80">
                    <span>Progression</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                    <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-[0.65rem] text-white/70">Fonds sécurisés par la banque partenaire</p>
              )}

              {locked && (
                <p className="mt-3 flex items-center gap-1 text-[0.62rem] text-white/85">
                  <Lock className="h-3 w-3" /> Retrait possible dès le{" "}
                  {new Date(a.lockedUntil!).toLocaleDateString("fr-FR")}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="mt-2 flex justify-center gap-1.5">
        {accounts.map((a, i) => (
          <span
            key={a.id}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === activeIndex ? 18 : 6,
              backgroundColor: i === activeIndex ? accentVar(a.color) : "var(--border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
