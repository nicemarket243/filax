import { type AppNotification } from "@/lib/filax-store";
import { Modal } from "@/components/filax/ui-kit";
import { FilaxLogo } from "@/components/filax-logo";
import { ArrowDownLeft, ArrowUpRight, Bell, PiggyBank, Send } from "lucide-react";

const ICONS = {
  depot: ArrowDownLeft,
  reception: ArrowDownLeft,
  retrait: ArrowUpRight,
  envoi: Send,
  cotisation: PiggyBank,
  systeme: Bell,
} as const;

const COLORS: Record<AppNotification["kind"], string> = {
  depot: "var(--brand-green)",
  reception: "var(--brand-green)",
  retrait: "var(--brand-red)",
  envoi: "var(--brand-blue)",
  cotisation: "var(--brand-blue)",
  systeme: "var(--muted-foreground)",
};

function relative(at: number) {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (m < 1) return "maintenant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export function NotificationsModal({
  open,
  onOpenChange,
  notifications,
  onClear,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  notifications: AppNotification[];
  onClear: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Centre de notifications" subtitle="Vos mouvements et alertes FILAX">
      {notifications.length === 0 ? (
        <p className="py-8 text-center text-[0.75rem] text-muted-foreground">Aucune notification pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {notifications.slice(0, 40).map((n) => {
            const Icon = ICONS[n.kind];
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 rounded-[1.4rem] border border-border/60 bg-muted/50 px-3 py-2.5 shadow-sm backdrop-blur-xl"
              >
                <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-surface soft-shadow">
                  <FilaxLogo height={12} />
                  <span
                    className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface"
                    style={{ backgroundColor: COLORS[n.kind] }}
                  >
                    <Icon className="h-2.5 w-2.5 text-background" />
                  </span>
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[0.78rem] font-bold text-foreground">{n.title}</p>
                    <span className="shrink-0 text-[0.6rem] text-muted-foreground">{relative(n.at)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[0.7rem] text-muted-foreground">{n.body}</p>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onClear}
            className="press mt-2 w-full rounded-full border border-border py-2.5 text-[0.72rem] font-semibold text-muted-foreground"
          >
            Tout effacer
          </button>
        </div>
      )}
    </Modal>
  );
}
