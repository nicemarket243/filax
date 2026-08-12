import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CoffreProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Tiroir « Coffre » — fermé par défaut, animation fluide façon iOS. */
export function Coffre({ title, subtitle, icon, badge, defaultOpen = false, children }: CoffreProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-3xl bg-surface soft-shadow">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="press flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-3">
          {icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">{icon}</span>
          )}
          <span className="leading-tight">
            <span className="block text-[0.85rem] font-bold tracking-tight text-foreground">{title}</span>
            {subtitle && <span className="block text-[0.65rem] text-muted-foreground">{subtitle}</span>}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6rem] font-bold text-muted-foreground">{badge}</span>
          )}
          <ChevronDown
            className="h-4 w-4 text-muted-foreground transition-transform duration-300"
            style={{ transform: open ? "rotate(180deg)" : undefined }}
          />
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-400 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{open && children}</div>
        </div>
      </div>
    </section>
  );
}
