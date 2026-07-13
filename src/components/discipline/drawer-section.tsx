import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface DrawerSectionProps {
  icon: ReactNode;
  title: string;
  count?: number;
  /** Small text on the right of the header (before the chevron). */
  meta?: string;
  defaultOpen?: boolean;
  /** Full tailwind classes for the icon container, e.g. "bg-brand-green/12 text-brand-green". */
  iconClass?: string;
  children: ReactNode;
}

/**
 * Tiroir (accordéon) FILAX — fermé par défaut, s'ouvre au clic.
 * Reprend l'esthétique épurée des autres modules : pas de longue liste
 * affichée directement à l'écran, tout est rangé dans des tiroirs.
 */
export function DrawerSection({
  icon,
  title,
  count,
  meta,
  defaultOpen = false,
  iconClass = "bg-brand-green/12 text-brand-green",
  children,
}: DrawerSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:scale-[0.995]"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
          {typeof count === "number" && (
            <span className="text-[0.68rem] text-muted-foreground">
              {count} élément{count > 1 ? "s" : ""}
            </span>
          )}
        </span>
        {meta && <span className="shrink-0 text-[0.68rem] text-muted-foreground">{meta}</span>}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="animate-fade-up border-t border-white/5 px-3 pb-3 pt-3">{children}</div>}
    </div>
  );
}

