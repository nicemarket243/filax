import { useEffect, useRef, useState } from "react";

interface Quote {
  text: string;
  author: string;
}

/**
 * Courtes citations motivantes (finance, discipline, réussite, leadership…).
 * Entièrement en français. Chaque citation tient sur une seule ligne.
 */
const QUOTES: Quote[] = [
  { text: "La discipline crée la liberté.", author: "Jim Rohn" },
  { text: "La réussite suit la discipline.", author: "Jim Rohn" },
  { text: "La constance bat le talent.", author: "Anonyme" },
  { text: "La concentration crée les résultats.", author: "Tony Robbins" },
  { text: "La richesse grandit par la patience.", author: "Benjamin Graham" },
  { text: "Investis en toi-même d'abord.", author: "Benjamin Franklin" },
  { text: "Une idée exécutée vaut mille intentions.", author: "Anonyme" },
  { text: "Le temps est ton meilleur capital.", author: "Anonyme" },
  { text: "Agis aujourd'hui, récolte demain.", author: "Anonyme" },
  { text: "La liberté économique se construit chaque jour.", author: "Anonyme" },
];

export function QuoteRotator({ className }: { className?: string }) {
  // Start deterministically at 0 so SSR and the client render the same markup.
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      // Fade out, swap, fade back in.
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 500);
    }, 30000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const quote = QUOTES[index];

  return (
    <figure className={`text-center ${className ?? ""}`}>
      <div
        className="transition-opacity duration-500 ease-out"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <blockquote className="whitespace-nowrap text-[0.8rem] font-medium italic leading-relaxed text-foreground/90">
          « {quote.text} »
        </blockquote>
        <figcaption className="mt-1.5 text-xs font-medium tracking-wide text-brand-green">
          — {quote.author}
        </figcaption>
        {/* Fine ligne horizontale verte sous l'auteur */}
        <span className="mx-auto mt-3 block h-px w-24 bg-gradient-to-r from-transparent via-brand-green/70 to-transparent" />
      </div>
    </figure>
  );
}
