import { useEffect, useRef, useState } from "react";
import { QUOTES } from "./quotes-data";

/**
 * Flux "Dynamic Inspiration" — citations courtes (investissement, économie,
 * richesse, discipline financière, épargne). Rotation toutes les 6 secondes.
 */
const ROTATION_MS = 6000;
const FADE_MS = 250;


export function QuoteRotator({ className }: { className?: string }) {
  // Start deterministically at 0 so SSR and the client render the same markup.
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      // Fondu léger : disparaît, permute, réapparaît.
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATION_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const quote = QUOTES[index];

  return (
    <figure className={`text-center ${className ?? ""}`}>
      <div
        className="transition-opacity ease-out"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
      >
        <blockquote className="mx-auto max-w-full whitespace-nowrap text-[0.7rem] font-medium italic leading-snug text-foreground/95 sm:text-[0.78rem]">
          « {quote.text} »
        </blockquote>
        <figcaption className="mt-1 text-[0.62rem] font-medium tracking-wide text-brand-green">
          — {quote.author}
        </figcaption>
        {/* Fine ligne horizontale verte sous l'auteur */}
        <span className="mx-auto mt-3 block h-px w-24 bg-gradient-to-r from-transparent via-brand-green/70 to-transparent" />
      </div>
    </figure>
  );
}
