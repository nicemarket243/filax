import { useMemo } from "react";
import { formatMoney, type Account, type Transaction } from "@/lib/filax-store";

/** Courbe d'évolution du solde du compte sélectionné (style fintech). */
export function AccountChart({ account, transactions }: { account: Account; transactions: Transaction[] }) {
  const series = useMemo(() => {
    const txs = transactions.filter((t) => t.accountId === account.id).sort((a, b) => a.at - b.at);
    const points: number[] = [];
    let running = account.balance;
    const deltas = txs.map((t) => (t.type === "depot" || t.type === "reception" ? t.amount : -t.amount));
    for (let i = deltas.length - 1; i >= 0; i--) running -= deltas[i]!;
    points.push(running);
    for (const d of deltas) {
      running += d;
      points.push(running);
    }
    return points.length > 1 ? points : [account.balance * 0.85, account.balance];
  }, [account, transactions]);

  const stats = useMemo(() => {
    const txs = transactions.filter((t) => t.accountId === account.id);
    const inflow = txs.filter((t) => t.type === "depot" || t.type === "reception").reduce((s, t) => s + t.amount, 0);
    const outflow = txs.filter((t) => t.type !== "depot" && t.type !== "reception").reduce((s, t) => s + t.amount, 0);
    const start = series[0] ?? 0;
    const growth = start > 0 ? Math.round(((account.balance - start) / start) * 100) : 100;
    return { inflow, outflow, growth };
  }, [account, transactions, series]);

  const w = 300;
  const h = 110;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const coords = series.map((v, i) => [i * step, h - ((v - min) / span) * (h - 14) - 7] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-muted/50 p-3">
        <p className="text-[0.65rem] font-semibold text-muted-foreground">Évolution du solde · {account.name}</p>
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full" preserveAspectRatio="none" role="img" aria-label="Évolution du solde">
          <defs>
            <linearGradient id={`grad-${account.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-blue)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--brand-blue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#grad-${account.id})`} />
          <path d={line} fill="none" stroke="var(--brand-blue)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Dépôts" value={formatMoney(stats.inflow, account.currency)} color="var(--brand-green)" />
        <Stat label="Sorties" value={formatMoney(stats.outflow, account.currency)} color="var(--brand-red)" />
        <Stat label="Croissance" value={`${stats.growth > 0 ? "+" : ""}${stats.growth}%`} color="var(--brand-blue)" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 px-3 py-2.5 leading-tight">
      <p className="text-[0.6rem] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[0.75rem] font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
