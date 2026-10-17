import { useMemo, useState } from "react";
import { line as d3Line, curveMonotoneX } from "d3-shape";
import { formatMoney, type Account, type Transaction } from "@/lib/filax-store";

/** Courbe d'évolution du solde du compte sélectionné (style fintech), tactile comme le graphique Analyse. */
export function AccountChart({ account, transactions }: { account: Account; transactions: Transaction[] }) {
  const [point, setPoint] = useState<number | null>(null);

  const series = useMemo(() => {
    const txs = transactions.filter((t) => t.accountId === account.id).sort((a, b) => a.at - b.at);
    const deltas = txs.map((t) => (t.type === "depot" || t.type === "reception" ? t.amount : -t.amount));
    let running = account.balance;
    for (let i = deltas.length - 1; i >= 0; i--) running -= deltas[i]!;
    const pts: { value: number; at: number | null; tx: Transaction | null }[] = [
      { value: running, at: txs[0]?.at ?? null, tx: null },
    ];
    txs.forEach((tx, i) => {
      running += deltas[i] ?? 0;
      pts.push({ value: running, at: tx.at, tx });
    });
    return pts.length > 1 ? pts : [{ value: account.balance, at: null, tx: null }];
  }, [account, transactions]);

  const stats = useMemo(() => {
    const txs = transactions.filter((t) => t.accountId === account.id);
    const inflow = txs.filter((t) => t.type === "depot" || t.type === "reception").reduce((s, t) => s + t.amount, 0);
    const outflow = txs.filter((t) => t.type !== "depot" && t.type !== "reception").reduce((s, t) => s + t.amount, 0);
    const start = series[0]?.value ?? 0;
    const growth = start > 0 ? Math.round(((account.balance - start) / start) * 100) : 100;
    return { inflow, outflow, growth };
  }, [account, transactions, series]);

  const w = 300;
  const h = 110;
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const coords = series.map((p, i) => [series.length === 1 ? w / 2 : i * step, h - ((p.value - min) / span) * (h - 14) - 7] as const);
  const line = d3Line<readonly [number, number]>().x((p) => p[0]).y((p) => p[1]).curve(curveMonotoneX)(coords) ?? "";
  const area = `${line} L${w},${h} L0,${h} Z`;
  const selected = point != null ? series[point] : null;
  const selectedColor = selected?.tx
    ? selected.tx.type === "depot" || selected.tx.type === "reception"
      ? "var(--brand-green)"
      : "var(--brand-red)"
    : "var(--brand-blue)";
  const scrub = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * w;
    setPoint(Math.max(0, Math.min(series.length - 1, Math.round(x / step))));
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-muted/50 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[0.65rem] font-semibold text-muted-foreground">Évolution du solde · {account.name}</p>
          <p className="text-[0.65rem] font-bold text-foreground">{formatMoney(selected ? selected.value : account.balance, account.currency)}</p>
        </div>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="mt-2 w-full touch-none select-none overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label="Évolution du solde"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e); }}
          onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e); }}
          onPointerUp={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); setPoint(null); }}
          onPointerCancel={() => setPoint(null)}
          onLostPointerCapture={() => setPoint(null)}
        >
          <defs>
            <linearGradient id={`grad-${account.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-blue)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--brand-blue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#grad-${account.id})`} />
          <path d={line} fill="none" stroke="var(--brand-blue)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {coords.length === 1 && <circle cx={coords[0]?.[0]} cy={coords[0]?.[1]} r={4} fill="var(--brand-blue)" />}
          {point != null && point > 0 && coords[point] && (
            <path
              d={d3Line<readonly [number, number]>().x((p) => p[0]).y((p) => p[1]).curve(curveMonotoneX)(coords.slice(Math.max(0, point - 2), point + 1)) ?? ""}
              fill="none"
              stroke={selectedColor}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          )}
          {selected && point != null && coords[point] && (
            <g className="pointer-events-none">
              <line x1={coords[point][0]} y1={0} x2={coords[point][0]} y2={h} stroke="var(--foreground)" strokeOpacity={0.35} strokeDasharray="3 3" />
              <circle cx={coords[point][0]} cy={coords[point][1]} r={8} fill={selectedColor} opacity={0.25} />
              <circle cx={coords[point][0]} cy={coords[point][1]} r={4} fill="var(--surface)" stroke={selectedColor} strokeWidth={2.5} />
            </g>
          )}
        </svg>
        <div className="mt-1 min-h-8" aria-live="polite">
          {selected?.tx && (
            <p className="text-center text-[0.62rem] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">{new Date(selected.tx.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
              {" · "}
              {selected.tx.label}
              {" · "}
              <span className="font-bold" style={{ color: selectedColor }}>{formatMoney(selected.tx.amount, selected.tx.currency)}</span>
            </p>
          )}
        </div>
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
