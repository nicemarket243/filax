import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PARTNER_BANK, type AccentKey } from "@/lib/filax-store";

export function accentVar(key: AccentKey) {
  return `var(--${key})`;
}

export function tint(key: AccentKey, amount: number) {
  return `color-mix(in oklab, ${accentVar(key)} ${amount}%, var(--surface))`;
}

/* ---------------- Theme ---------------- */

const THEME_KEY = "filax-theme";

export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    setDark((d) => {
      const next = !d;
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  return { dark, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"}
      className={`press flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground ${className ?? ""}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/* ---------------- Building blocks ---------------- */

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-[0.95rem] font-bold tracking-tight text-foreground">{title}</h2>
      {action}
    </div>
  );
}

export function ProgressBar({ value, color = "brand-blue" }: { value: number; color?: AccentKey }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: accentVar(color) }}
      />
    </div>
  );
}

export function BankBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[0.7rem] font-black text-white"
        style={{ background: "var(--gradient-blue)" }}
      >
        EB
      </span>
      <div className="leading-tight">
        <p className="text-[0.7rem] font-bold text-foreground">{PARTNER_BANK}</p>
        {!compact && (
          <p className="text-[0.62rem] text-muted-foreground">Vos fonds sont sécurisés par notre banque partenaire.</p>
        )}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.7rem] font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand-blue ${props.className ?? ""}`}
    />
  );
}

export function PrimaryButton({
  children,
  color = "brand-blue",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { color?: AccentKey }) {
  return (
    <button
      {...props}
      className={`press w-full rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-40 ${props.className ?? ""}`}
      style={{ backgroundColor: accentVar(color) }}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[88vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border-white/20 bg-surface/85 p-5 backdrop-blur-2xl"
      >
        <div className="mb-4 pr-6">
          <DialogTitle className="text-base font-bold tracking-tight text-foreground">{title}</DialogTitle>
          {subtitle && <p className="mt-0.5 text-[0.72rem] text-muted-foreground">{subtitle}</p>}
        </div>

        {children}
      </DialogContent>
    </Dialog>
  );
}
