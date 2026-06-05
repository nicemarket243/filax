import { useEffect, useRef, useState } from "react";

interface Quote {
  text: string;
  author: string;
}

/**
 * Courtes citations motivantes (finance, discipline, réussite, leadership…).
 * Entièrement en français.
 */
const QUOTES: Quote[] = [
  { text: "La discipline crée la liberté.", author: "Jim Rohn" },
  { text: "La réussite suit la discipline.", author: "Jim Rohn" },
  { text: "Les petites actions créent les grandes fortunes.", author: "Warren Buffett" },
  { text: "La constance bat le talent.", author: "Anonyme" },
  { text: "La concentration crée les résultats.", author: "Tony Robbins" },
  { text: "La richesse grandit par la patience.", author: "Benjamin Graham" },
  { text: "N'épargnez pas ce qui reste après avoir dépensé.", author: "Warren Buffett" },
  { text: "Le risque vient de ne pas savoir ce que l'on fait.", author: "Warren Buffett" },
  { text: "Investis en toi-même d'abord.", author: "Benjamin Franklin" },
  { text: "Une idée exécutée vaut mille intentions.", author: "Anonyme" },
  { text: "La persévérance transforme l'échec en réussite.", author: "Anonyme" },
  { text: "Le temps est ton meilleur capital.", author: "Anonyme" },
  { text: "Agis aujourd'hui, récolte demain.", author: "Anonyme" },
  { text: "L'innovation distingue le leader du suiveur.", author: "Steve Jobs" },
  { text: "La liberté économique se construit chaque jour.", author: "Anonyme" },
];

export function QuoteRotator({ className }: { className?: string }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
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
        <blockquote className="text-base font-medium italic leading-relaxed text-foreground/90">
          « {quote.text} »
        </blockquote>
        <figcaption className="mt-2 text-xs font-medium tracking-wide text-muted-foreground">
          — {quote.author} —
        </figcaption>
      </div>
    </figure>
  );
}
