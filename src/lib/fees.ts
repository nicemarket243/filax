export type FeeRule = { operation: string; method?: string | null; partner?: string | null; currency?: string | null; fixed: number; percent: number; min_fee: number; active?: boolean };
export type FeeQuery = { operation: string; method?: string; partner?: string; currency: string };

/** Picks the most specific active rule ("*" operation acts as fallback). */
export function pickRule(rules: FeeRule[], q: FeeQuery): FeeRule | null {
  const score = (r: FeeRule) => {
    if (r.active === false) return -1;
    if (r.operation !== "*" && r.operation !== q.operation) return -1;
    let s = r.operation === "*" ? 0 : 8;
    for (const [k, v, w] of [["method", q.method, 4], ["partner", q.partner, 2], ["currency", q.currency, 1]] as const) {
      const rv = r[k];
      if (rv == null) continue;
      if (rv !== v) return -1;
      s += w;
    }
    return s;
  };
  let best: FeeRule | null = null, bs = -1;
  for (const r of rules) { const s = score(r); if (s > bs) { bs = s; best = r; } }
  return best;
}

export function computeFee(rule: FeeRule | null, amount: number): number {
  if (!rule || amount <= 0) return 0;
  const f = Number(rule.fixed) + (amount * Number(rule.percent)) / 100;
  return Math.round(Math.max(f, Number(rule.min_fee)) * 100) / 100;
}

/** Withdrawal check: only the selected compartment's available balance counts. */
export function checkOutflow(available: number, amount: number, fee: number, lockedUntil?: string | null, now = new Date()) {
  if (lockedUntil && new Date(lockedUntil) > now) return { ok: false as const, reason: "locked" as const };
  const total = Math.round((amount + fee) * 100) / 100;
  if (total > available) return { ok: false as const, reason: "insufficient" as const, total };
  return { ok: true as const, total, remaining: Math.round((available - total) * 100) / 100 };
}
