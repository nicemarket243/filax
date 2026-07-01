import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CoffreProps {
  title: string;
  /** Petit compteur affiché à droite du titre (ex: nombre de comptes). */
  count?: number | string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Tiroir « Coffre » — bouton long et rectangulaire en glassmorphism léger,
 * sans bordure opaque. Déploiement vertical ultra-fluide (courbe iOS ease-in-out)
 * via l'astuce grid-template-rows 0fr → 1fr, sans rechargement de page.
 */
export function Coffre({ title, count, defaultOpen = false, children }: CoffreProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl bg-white/[0.04] backdrop-blur-xl shadow-[0_8px_30px_-16px_rgba(0,0,0,0.6)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors active:bg-white/[0.03]"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[0.66rem] font-semibold text-muted-foreground">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-0.5">{children}</div>
        </div>
      </div>
    </section>
  );
}
