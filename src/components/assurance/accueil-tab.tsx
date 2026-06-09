import { Smartphone, Tablet, Laptop, ShieldCheck, Plus, ChevronRight } from "lucide-react";
import {
  type AssuranceData,
  type DeviceType,
  DEVICE_LABEL,
  STATUS_LABEL,
  carenceRemaining,
  formatDate,
} from "./store";

const DEVICE_ICON: Record<DeviceType, typeof Smartphone> = {
  telephone: Smartphone,
  tablette: Tablet,
  ordinateur: Laptop,
};

const STATUS_STYLE: Record<string, { dot: string; text: string }> = {
  actif: { dot: "bg-brand-green", text: "text-brand-green" },
  carence: { dot: "bg-brand-gold", text: "text-brand-gold" },
  sinistre: { dot: "bg-brand-red", text: "text-brand-red" },
};

interface AccueilTabProps {
  data: AssuranceData;
  onAssurer: () => void;
}

export function AccueilTab({ data, onAssurer }: AccueilTabProps) {
  const total = data.devices.length;
  const active = data.devices.filter((d) => d.status === "actif").length;

  return (
    <div className="space-y-6">
      {/* Carte de couverture */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-green/25 via-card to-black p-6 shadow-[0_18px_50px_-22px_rgba(0,0,0,0.9)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-brand-green/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/20">
            <ShieldCheck className="h-6 w-6 text-brand-green" />
          </span>
          <div>
            <p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Appareils assurés</p>
            <p className="text-3xl font-extrabold leading-none text-foreground">{total}</p>
          </div>
        </div>
        <p className="relative mt-4 text-[0.74rem] text-muted-foreground">
          {active} appareil{active > 1 ? "s" : ""} pleinement protégé{active > 1 ? "s" : ""} · couverture vol & perte.
        </p>
      </div>

      <button
        onClick={onAssurer}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-4 text-[0.82rem] font-bold text-background shadow-[0_10px_30px_-12px_oklch(0.72_0.22_140/0.7)] transition-all active:scale-[0.98]"
      >
        <Plus className="h-4.5 w-4.5" strokeWidth={2.5} /> Assurer un appareil
      </button>

      <section>
        <h2 className="mb-3 text-sm font-bold text-foreground">Mes appareils</h2>
        {data.devices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
            <p className="text-[0.78rem] text-muted-foreground">Aucun appareil assuré pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.devices.map((dev) => {
              const Icon = DEVICE_ICON[dev.type];
              const s = STATUS_STYLE[dev.status];
              return (
                <div
                  key={dev.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06]">
                    <Icon className="h-5 w-5 text-foreground" strokeWidth={1.6} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.84rem] font-semibold text-foreground">{dev.name}</p>
                    <p className="flex items-center gap-1.5 text-[0.66rem] text-muted-foreground">
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                      <span className={s.text}>{STATUS_LABEL[dev.status]}</span>
                      {dev.status === "carence" && <span>· {carenceRemaining(dev.carenceUntil)}</span>}
                    </p>
                    <p className="mt-0.5 text-[0.6rem] text-muted-foreground">
                      {DEVICE_LABEL[dev.type]} · IMEI {dev.imei.slice(0, 6)}••• · {formatDate(dev.registeredAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
