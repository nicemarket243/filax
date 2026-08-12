import { formatDate, type AppNotification } from "@/lib/filax-store";
import { Modal } from "@/components/filax/ui-kit";
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
    <Modal open={open} onOpenChange={onOpenChange} title="Notifications" subtitle="Vos mouvements et alertes FILAX">
      {notifications.length === 0 ? (
        <p className="py-8 text-center text-[0.75rem] text-muted-foreground">Aucune notification pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {notifications.slice(0, 40).map((n) => {
            const Icon = ICONS[n.kind];
            return (
              <div key={n.id} className="flex items-start gap-3 rounded-2xl bg-muted/60 px-3 py-2.5">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `color-mix(in oklab, ${COLORS[n.kind]} 14%, transparent)`, color: COLORS[n.kind] }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="text-[0.78rem] font-bold text-foreground">{n.title}</p>
                  <p className="text-[0.68rem] text-muted-foreground">{n.body}</p>
                  <p className="mt-0.5 text-[0.6rem] text-muted-foreground/80">{formatDate(n.at)}</p>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onClear}
            className="press mt-2 w-full rounded-xl border border-border py-2.5 text-[0.72rem] font-semibold text-muted-foreground"
          >
            Tout effacer
          </button>
        </div>
      )}
    </Modal>
  );
}
