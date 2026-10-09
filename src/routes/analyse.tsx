import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, History, Target, TrendingUp } from "lucide-react";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { Coffre } from "@/components/filax/coffre";
import { Button } from "@/components/ui/button";
import { GoalEvolution, type GeneralGoal } from "@/components/filax/goal-evolution";
import { Modal, PageTitle, ProgressBar, accentVar } from "@/components/filax/ui-kit";
import { useI18n } from "@/lib/i18n";
import { useDbUser, useDbAccounts, useDbTransactions, useDbGoals } from "@/lib/filax-db";
import {
  METHOD_LABEL,
  formatDate,
  formatMoney,
  pct,
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

const CDF_PER_USD = 2299;
const toUsd = (amount: number, currency: string) => (currency === "CDF" ? amount / CDF_PER_USD : amount);

function AnalysePage() {
  const { t } = useI18n();
  const { data } = useFilax();
  const userId = useDbUser();
  const db = useDbAccounts(userId);
  const dbTx = useDbTransactions(userId, db.accounts);
  const live = !!userId;
  const accounts = live ? db.accounts ?? [] : data.accounts;
  const dbGoals = useDbGoals(userId);
  const goals = live ? dbGoals.goals ?? [] : data.goals;
  const transactions = live ? dbTx.transactions ?? [] : data.transactions;
  const [periodKey, setPeriodKey] = useState("30j");
  const [point, setPoint] = useState<number | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);

  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[1] ?? { ms: null };
  const totalUsd = accounts.reduce((s, a) => s + toUsd(a.balance, a.currency), 0);
  const allTx = useMemo(() => [...transactions].sort((a, b) => b.at - a.at), [transactions]);
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "Compte";

  const stats = useMemo(() => {
    const since = period.ms ? Date.now() - period.ms : 0;
    const list = transactions.filter((t) => t.at >= since).sort((a, b) => a.at - b.at);
    let inflow = 0;
    let outflow = 0;
    const byMethod = new Map<Transaction["method"], number>();
    for (const t of list) {
      const v = toUsd(t.amount, t.currency);
      if (isIn(t)) inflow += v;
      else outflow += v;
      byMethod.set(t.method, (byMethod.get(t.method) ?? 0) + v);
    }
    return { list, inflow, outflow, net: inflow - outflow, byMethod };
  }, [transactions, period.ms]);

  // Courbe agrégée de tous les comptes (en USD).
  const series = useMemo(() => {
    const deltas = stats.list.map((t) => (isIn(t) ? 1 : -1) * toUsd(t.amount, t.currency));
    let start = totalUsd;
    for (const d of deltas) start -= d;
    const pts = [{ at: stats.list[0]?.at ?? Date.now(), value: start, tx: null as Transaction | null }];
    let running = start;
    stats.list.forEach((t, i) => {
      running += deltas[i] ?? 0;
      pts.push({ at: t.at, value: running, tx: t });
    });
    return pts.length > 1 ? pts : [...pts, { at: Date.now(), value: totalUsd, tx: null }];
  }, [stats.list, totalUsd]);

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
  const generalGoals: GeneralGoal[] = [
    ...accounts.flatMap((a) => a.target && a.target > 0 ? [{ id: `account-${a.id}`, name: a.name, accountId: a.id, target: a.target, saved: a.balance, currency: a.currency, kind: "account" as const }] : []),
    ...goals.map((g) => ({ ...g, id: `goal-${g.id}`, kind: "goal" as const })),
  ];
  const selectedGoal = generalGoals.find((g) => g.id === goalId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />

      <PageTitle title="Analyse" subtitle="Vision globale de tout votre portefeuille." />

      <div className="mt-5 rounded-3xl p-5 text-primary-foreground soft-shadow" style={{ background: "var(--gradient-magnetide, var(--gradient-blue))" }}>
        <p className="text-[0.7rem] text-white/80">{t("Portefeuille total")} · {accounts.length} {t("comptes")}</p>
        <p className="mt-1 text-[1.9rem] font-extrabold leading-none tracking-tight">{formatMoney(totalUsd, "USD")}</p>
        <p className="mt-2 text-[0.65rem] text-white/80">
          {t("Converti en USD")} (1 $ = {CDF_PER_USD.toLocaleString("fr-FR")} FC) · {stats.list.length} {t("opération(s)")}
        </p>
      </div>

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

      <div className="mt-4 rounded-3xl border border-border bg-surface p-4 soft-shadow">
        <div className="flex items-start justify-between">
          <p className="text-[0.7rem] font-semibold text-muted-foreground">Évolution de tous les comptes</p>
          <p className="text-[0.7rem] font-bold text-foreground">{formatMoney(selected ? selected.value : totalUsd, "USD")}</p>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full overflow-visible" role="img" aria-label="Évolution globale">
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
                {" "}· {accName(selected.tx.accountId)} · {formatDate(selected.tx.at)} · {formatMoney(selected.tx.amount, selected.tx.currency)}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Touchez un point de la courbe pour voir l'opération.</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatCard label="Entrées" value={formatMoney(stats.inflow, "USD")} color="brand-green" icon={<ArrowDownLeft className="h-3.5 w-3.5" />} />
        <StatCard label="Sorties" value={formatMoney(stats.outflow, "USD")} color="brand-red" icon={<ArrowUpRight className="h-3.5 w-3.5" />} />
        <StatCard
          label="Solde net"
          value={`${stats.net >= 0 ? "+" : "−"}${formatMoney(Math.abs(stats.net), "USD")}`}
          color={stats.net >= 0 ? "brand-blue" : "brand-red"}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
      </div>

      <div className="mt-4">
        <Coffre title="Répartition par moyen" subtitle="Montants par moyen de paiement" icon={<TrendingUp className="h-4 w-4" />} badge={`${methods.length}`}>
        <div className="space-y-2.5">
          {methods.map(([m, amount]) => (
            <div key={m}>
              <div className="flex items-center justify-between text-[0.68rem]">
                <span className="font-semibold text-foreground">{METHOD_LABEL[m]}</span>
                <span className="text-muted-foreground">{formatMoney(amount, "USD")}</span>
              </div>
              <div className="mt-1">
                <ProgressBar value={Math.round((amount / totalFlow) * 100)} color="brand-blue" />
              </div>
            </div>
          ))}
          {methods.length === 0 && <p className="text-[0.68rem] text-muted-foreground">Aucune opération sur cette période.</p>}
        </div>
        </Coffre>
      </div>

      <div className="mt-4 space-y-3">
        <Coffre title="Objectifs Généraux" subtitle="Tous les comptes, toutes devises" icon={<Target className="h-4 w-4" />} badge={`${generalGoals.length}`}>
          <div className="space-y-4">
            {accounts.map((account) => {
              const list = generalGoals.filter((g) => g.accountId === account.id);
              return <div key={account.id}>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{account.name}</h3>
                {list.length ? <div className="space-y-2">{list.map((goal) => (
                  <Button key={goal.id} variant="ghost" onClick={() => setGoalId(goal.id)} className="h-auto w-full flex-col items-stretch gap-1.5 whitespace-normal rounded-2xl bg-muted/40 px-3 py-2.5 text-left">
                    <span className="flex items-center justify-between gap-2 text-xs"><span className="min-w-0 break-words font-semibold">{goal.name}</span><span className="shrink-0 font-bold text-brand-green">{pct(goal.saved, goal.target)}%</span></span>
                    <ProgressBar value={pct(goal.saved, goal.target)} color={account.color} />
                    <span className="text-[0.65rem] text-muted-foreground">{formatMoney(goal.saved, goal.currency)} / {formatMoney(goal.target, goal.currency)}</span>
                  </Button>
                ))}</div> : <p className="text-[0.65rem] text-muted-foreground">Aucun objectif sur ce compte pour l'instant.</p>}
              </div>;
            })}
            {!accounts.length && <p className="text-xs text-muted-foreground">Aucun objectif sur ce compte pour l'instant.</p>}
          </div>
        </Coffre>

        <Coffre title="Historique" subtitle="Tous les comptes, toutes devises" icon={<History className="h-4 w-4" />} badge={`${allTx.length}`}>
          <div className="space-y-2">
            {dbTx.error && <div role="alert" className="text-xs text-brand-red"><p>Impossible de charger l’historique.</p><Button variant="ghost" onClick={() => void dbTx.refresh()}>Réessayer</Button></div>}
            {live && !dbTx.transactions && !dbTx.error && <p className="text-xs text-muted-foreground">Chargement…</p>}
            {allTx.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2.5">
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[0.78rem] font-semibold text-foreground">{t.label}</p>
                  <p className="truncate text-[0.62rem] text-muted-foreground">
                    {accName(t.accountId)} · {formatDate(t.at)} · {t.origin ?? METHOD_LABEL[t.method]}
                  </p>
                </div>
                <span className="shrink-0 text-right leading-tight">
                  <span className="block text-[0.8rem] font-bold" style={{ color: accentVar(isIn(t) ? "brand-green" : "brand-red") }}>
                    {isIn(t) ? "+" : "−"}
                    {formatMoney(t.amount, t.currency)}
                  </span>
                  <span className="block text-[0.55rem] font-bold text-muted-foreground">{t.currency}</span>
                </span>
              </div>
            ))}
            {allTx.length === 0 && (
              <p className="rounded-2xl bg-muted/40 px-3 py-4 text-center text-[0.7rem] text-muted-foreground">Aucune opération.</p>
            )}
          </div>
        </Coffre>
      </div>

      <Modal open={!!selectedGoal} onOpenChange={(open) => { if (!open) setGoalId(null); }} title={selectedGoal?.name ?? "Objectif"} subtitle={selectedGoal ? accName(selectedGoal.accountId) : undefined}>
        {selectedGoal && <div className="space-y-5">
          <div><p className="text-2xl font-bold text-brand-green">{formatMoney(selectedGoal.saved, selectedGoal.currency)}</p><p className="mt-1 text-xs text-muted-foreground">{t("Objectif financier")} · {formatMoney(selectedGoal.target, selectedGoal.currency)}</p><div className="mt-3"><ProgressBar value={pct(selectedGoal.saved, selectedGoal.target)} /></div></div>
          <GoalEvolution goal={selectedGoal} transactions={transactions} />
        </div>}
      </Modal>
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
