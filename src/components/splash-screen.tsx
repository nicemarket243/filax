import { useEffect, useState } from "react";
import { FilaxLogo } from "@/components/filax-logo";

const SESSION_KEY = "filax-splash-seen";
const DURATION = 3500; // 3.5s — chargement fluide de 1% à 100%

/**
 * Écran de démarrage FILAX — fond noir profond, lueur verte subtile en haut,
 * logo FILAX haute définition et barre de progression verte fluide (1% → 100%).
 * S'affiche une seule fois par session.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(1);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    setVisible(true);
    const start = performance.now();
    let raf = 0;

    const tick = (t: number) => {
      const elapsed = t - start;
      const pct = Math.min(100, Math.max(1, Math.round((elapsed / DURATION) * 100)));
      setProgress(pct);
      if (elapsed < DURATION) {
        raf = requestAnimationFrame(tick);
      } else {
        sessionStorage.setItem(SESSION_KEY, "1");
        setLeaving(true);
        setTimeout(() => setVisible(false), 500);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070707] transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Lueur verte subtile uniquement tout en haut de l'écran (réf. TrackFit) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, oklch(0.72 0.22 140 / 0.28) 0%, oklch(0.72 0.22 140 / 0.08) 40%, transparent 70%)",
        }}
      />

      {/* Logo FILAX haute définition, net et centré */}
      <div className="relative flex flex-col items-center">
        <FilaxLogo height={56} className="animate-fade-up drop-shadow-[0_0_30px_oklch(0.72_0.22_140/0.35)]" />

        {/* Barre de progression verte fluide juste sous le logo */}
        <div className="mt-10 h-1 w-44 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-green/70 to-brand-green transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="mt-3 text-[0.7rem] font-medium tracking-widest text-white/40">{progress}%</span>
      </div>
    </div>
  );
}
