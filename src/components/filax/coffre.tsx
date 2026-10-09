import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoffreProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/** Tiroir « Coffre » — fermé par défaut, animation fluide façon iOS. */
export function Coffre({ title, subtitle, icon, badge, open: controlledOpen, onOpenChange, children }: CoffreProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const pathname = useLocation({ select: (location) => location.pathname });
  const callback = useRef(onOpenChange);
  callback.current = onOpenChange;
  const openRef = useRef(controlledOpen ?? internalOpen);
  openRef.current = controlledOpen ?? internalOpen;
  const close = () => {
    if (!openRef.current) return;
    openRef.current = false;
    setInternalOpen(false);
    callback.current?.(false);
  };
  useEffect(() => {
    close();
  }, [pathname]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) close();
    };
    const exclusive = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) close();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("filax:drawer-open", exclusive);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("filax:drawer-open", exclusive);
      document.removeEventListener("keydown", escape);
    };
  }, [id]);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    openRef.current = next;
    if (next) document.dispatchEvent(new CustomEvent("filax:drawer-open", { detail: id }));
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <section ref={root} className="overflow-hidden rounded-3xl bg-surface soft-shadow">
      <Button
        variant="ghost"
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`${id}-content`}
        className="press flex h-auto w-full items-center justify-between gap-3 whitespace-normal rounded-none px-4 py-3.5 text-left"
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
      </Button>

      <div
        id={`${id}-content`}
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
