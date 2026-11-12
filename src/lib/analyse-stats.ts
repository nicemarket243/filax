import type { Transaction } from "@/lib/filax-store";

export const DAY = 86_400_000;
export const CDF_PER_USD = 2299;
export const toUsd = (amount: number, currency: string) => (currency === "CDF" ? amount / CDF_PER_USD : amount);
export const isIn = (t: Pick<Transaction, "type">) => t.type === "depot" || t.type === "reception";

type Tx = Pick<Transaction, "amount" | "currency" | "type" | "at" | "method"> & { status?: Transaction["status"] };

/** Confirmed operations inside [now - periodMs, now], with USD totals. periodMs null = all time. */
export function periodStats<T extends Tx>(transactions: T[], periodMs: number | null, now: number) {
  const since = periodMs ? now - periodMs : 0;
  const list = transactions.filter((t) => t.at >= since && t.at <= now && (!t.status || t.status === "confirmed")).sort((a, b) => a.at - b.at);
  let inflow = 0, outflow = 0;
  const byMethod = new Map<T["method"], number>();
  for (const t of list) {
    const v = toUsd(t.amount, t.currency);
    if (isIn(t)) inflow += v; else outflow += v;
    byMethod.set(t.method, (byMethod.get(t.method) ?? 0) + v);
  }
  return { list, inflow, outflow, net: inflow - outflow, byMethod };
}

/** Balance curve (USD) rebuilt backwards from the current total; ends at `now` on the current total. */
export function balanceSeries<T extends Tx>(list: T[], totalUsd: number, periodMs: number | null, now: number) {
  const deltas = list.map((t) => (isIn(t) ? 1 : -1) * toUsd(t.amount, t.currency));
  const start = deltas.reduce((s, d) => s - d, totalUsd);
  const pts: { at: number; value: number; tx: T | null }[] = [{ at: periodMs ? now - periodMs : (list[0]?.at ?? now) - 1, value: start, tx: null }];
  let running = start;
  list.forEach((t, i) => { running += deltas[i] ?? 0; pts.push({ at: t.at, value: running, tx: t }); });
  pts.push({ at: now, value: totalUsd, tx: null });
  return pts;
}
