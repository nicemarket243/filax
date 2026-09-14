import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, History, TrendingUp } from "lucide-react";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { Coffre } from "@/components/filax/coffre";
import { Glyph } from "@/components/filax/glyph";
import { PageTitle, ProgressBar, accentVar } from "@/components/filax/ui-kit";
import {
  METHOD_LABEL,
  analyse,
  formatDate,
  formatMoney,
  useActiveAccountId,
  useFilax,
  type Transaction,
} from "@/lib/filax-store";

export const Route = createFileRoute("/analyse")({
  head: () => ({
    meta: [
      { title: "Analyse de vos finances — FILAX" },
      { name: "description", content: "Visualisez vos entrées, sorties et l'évolution de votre épargne compte par compte." },
      { property: "og:title", content: "Analyse financière FILAX" },
      { property: "og:description", content: "Entrées, sorties et progression de votre épargne en un coup d'œil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalysePage,
});

const DAY = 86_400_000;
const PERIODS: { key: string; label: string; ms: number | null }[] = [
  { key: "7j", label: "7 jours", ms: 7 * DAY },
  { key: "30j", label: "30 jours", ms: 30 * DAY },
  { key: "12m", label: "12 mois", ms: 365 * DAY },
  { key: "all", label: "Tout", ms: null },
];

function isIn(t: Transaction) {
  return t.type === "depot" || t.type === "reception";
}

function AnalysePage() {
  const { data } = useFilax();
  const { transactions, accounts } = data;
  const { activeId, select } = useActiveAccountId(accounts);
  const [periodKey, setPeriodKey] = useState("30j");
  const [point, setPoint] = useState<number | null>(null);

  const active = accounts.find((a) => a.id === activeId) ?? accounts[0]!;
  const accountTx = transactions.filter((t) => t.accountId === active.id);
  const period = PERIODS.find((p) => p.key === periodKey)!;
  const stats = useMemo(() => analyse(accountTx, period.ms), [accountTx, period.ms]);

  // Reconstruction du solde au fil des opérations de la période sélectionnée.
  const series = useMemo(() => {
    const deltas = stats.list.map((t) => (isIn(t) ? t.amount : -t.amount));
    let start = active.balance;
    for (const d of deltas) start -= d;
    const pts = [{ at: stats.list[0]?.at ?? Date.now(), value: start, tx: null as Transaction | null }];
    let running = start;
    stats.list.forEach((t, i) => {
      running += deltas[i]!;
      pts.push({ at: t.at, value: running, tx: t });
    });
    return pts.length > 1 ? pts : [pts[0]!, { at: Date.now(), value: active.balance, tx: null }];
  }, [stats.list, active.balance]);

  const w = 300;
  const h = 120;
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const coords = series.map((p, i) => [i * step, h - ((p.value - min) / span) * (h - 20) - 10] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const selected = point != null ? series[point] : null;

  const totalFlow = stats.inflow + stats.outflow || 1;
  const methods = [...stats.byMethod.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />

      <PageTitle title="Analyse" subtitle="Chaque chiffre correspond au compte sélectionné." />

      {/* Sélecteur de compte — partagé avec l'accueil. */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {accounts.map((a) => {
          const on = a.id === active.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                select(a.id);
                setPoint(null);
              }}
              className="press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[0.7rem] font-semibold transition"
              style={{
                backgroundColor: on ? `color-mix(in oklab, ${accentVar(a.color)} 16%, transparent)` : "var(--muted)",
                color: on ? accentVar(a.color) : "var(--muted-foreground)",
              }}
            >
              <Glyph icon={a.icon} className="h-3.5 w-3.5" />
              {a.name}
            </button>
          );
        })}
      </div>

      <div
        className="mt-4 rounded-3xl p-5 text-white soft-shadow"
        style={{ background: `linear-gradient(140deg, ${accentVar(active.color)}, color-mix(in oklab, ${accentVar(active.color)} 40%, #05070f))` }}
      >
        <p className="text-[0.7rem] text-white/80">{active.name}</p>
        <p className="mt-1 text-[1.9rem] font-extrabold leading-none tracking-tight">
          {formatMoney(active.balance, active.currency)}
        </p>
        <p className="mt-2 text-[0.65rem] text-white/80">
          {stats.list.length} opération(s) · {period.label.toLowerCase()}
        </p>
      </div>

      {/* Périodes interactives */}
      <div className="mt-4 flex gap-1.5 rounded-full bg-muted p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setPeriodKey(p.key);
              setPoint(null);
            }}
            className={`press flex-1 rounded-full py-2 text-[0.68rem] font-bold transition ${
              p.key === periodKey ? "bg-surface text-brand-blue soft-shadow" : "text-muted-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Courbe interactive : chaque point affiche l'opération correspondante. */}
      <div className="mt-4 rounded-3xl border border-border bg-surface p-4 soft-shadow">
        <div className="flex items-start justify-between">
          <p className="text-[0.7rem] font-semibold text-muted-foreground">Évolution du solde</p>
          <p className="text-[0.7rem] font-bold text-foreground">
            {selected ? formatMoney(selected.value, active.currency) : formatMoney(active.balance, active.currency)}
          </p>
        </div>

        <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full overflow-visible" role="img" aria-label="Évolution du solde">
          <defs>
            <linearGradient id="analyse-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-blue)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--brand-blue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#analyse-grad)" />
          <path d={line} fill="none" stroke="var(--brand-blue)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {coords.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={point === i ? 5 : 3.5}
              fill={point === i ? "var(--brand-green)" : "var(--surface)"}
              stroke="var(--brand-blue)"
              strokeWidth={2}
              className="cursor-pointer"
              onClick={() => setPoint(point === i ? null : i)}
            />
          ))}
        </svg>

        <div className="mt-2 min-h-[2.2rem] rounded-2xl bg-muted/50 px-3 py-2 text-[0.66rem] leading-tight">
          {selected?.tx ? (
            <>
              <span className="font-semibold text-foreground">{selected.tx.label}</span>
              <span className="text-muted-foreground">
                {" "}
                · {formatDate(selected.tx.at)} · {selected.tx.origin ?? METHOD_LABEL[selected.tx.method]}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Touchez un point de la courbe pour voir l'opération.</span>
          )}
        </div>
      </div>

      {/* Statistiques de la période */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatCard label="Entrées" value={formatMoney(stats.inflow, active.currency)} color="brand-green" icon={<ArrowDownLeft className="h-3.5 w-3.5" />} />
        <StatCard label="Sorties" value={formatMoney(stats.outflow, active.currency)} color="brand-red" icon={<ArrowUpRight className="h-3.5 w-3.5" />} />
        <StatCard
          label="Solde net"
          value={`${stats.net >= 0 ? "+" : "−"}${formatMoney(Math.abs(stats.net), active.currency)}`}
          color={stats.net >= 0 ? "brand-blue" : "brand-red"}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Répartition par moyen utilisé */}
      <div className="mt-4 rounded-3xl border border-border bg-surface p-4 soft-shadow">
        <p className="text-[0.7rem] font-semibold text-muted-foreground">Répartition par moyen</p>
        <div className="mt-3 space-y-2.5">
          {methods.map(([m, amount]) => (
            <div key={m}>
              <div className="flex items-center justify-between text-[0.68rem]">
                <span className="font-semibold text-foreground">{METHOD_LABEL[m]}</span>
                <span className="text-muted-foreground">{formatMoney(amount, active.currency)}</span>
              </div>
              <div className="mt-1">
                <ProgressBar value={Math.round((amount / totalFlow) * 100)} color="brand-blue" />
              </div>
            </div>
          ))}
          {methods.length === 0 && (
            <p className="text-[0.68rem] text-muted-foreground">Aucune opération sur cette période.</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Coffre
          title="Historique complet"
          subtitle={active.name}
          icon={<History className="h-4 w-4" />}
          badge={`${accountTx.length}`}
        >
          <div className="space-y-2">
            {accountTx.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2.5">
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[0.78rem] font-semibold text-foreground">{t.label}</p>
                  <p className="text-[0.62rem] text-muted-foreground">
                    {formatDate(t.at)} · {t.origin ?? METHOD_LABEL[t.method]} · {t.reference}
                  </p>
                </div>
                <span className="text-[0.8rem] font-bold" style={{ color: accentVar(isIn(t) ? "brand-green" : "brand-red") }}>
                  {isIn(t) ? "+" : "−"}
                  {formatMoney(t.amount, t.currency)}
                </span>
              </div>
            ))}
            {accountTx.length === 0 && (
              <p className="rounded-2xl bg-muted/40 px-3 py-4 text-center text-[0.7rem] text-muted-foreground">
                Aucune opération sur ce compte.
              </p>
            )}
          </div>
        </Coffre>
      </div>

      <BottomNav />
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: Parameters<typeof accentVar>[0];
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 py-2.5 leading-tight soft-shadow">
      <span className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
        <span style={{ color: accentVar(color) }}>{icon}</span>
        {label}
      </span>
      <p className="mt-1 text-[0.72rem] font-bold" style={{ color: accentVar(color) }}>
        {value}
      </p>
    </div>
  );
}
