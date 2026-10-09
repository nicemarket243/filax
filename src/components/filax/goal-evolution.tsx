import { useId } from "react";
import { formatMoney, type Currency, type Transaction } from "@/lib/filax-store";
import { useI18n } from "@/lib/i18n";

export interface GeneralGoal {
  id: string;
  name: string;
  accountId: string;
  target: number;
  saved: number;
  currency: Currency;
  kind: "account" | "goal";
}

/** Only recorded movements are used; no synthetic growth or dates. */
export function GoalEvolution({ goal, transactions }: { goal: GeneralGoal; transactions: Transaction[] }) {
  const id = useId();
  const { t, lang } = useI18n();
  const movements = transactions.filter((tx) => goal.kind === "account"
    ? tx.accountId === goal.accountId
    : (tx.sourceType === "goal_fund" && tx.origin === goal.name) || (!tx.sourceType && tx.label === `Épargne · ${goal.name}`))
    .sort((a, b) => a.at - b.at);
  const delta = (tx: Transaction) => goal.kind === "goal" ? tx.amount
    : tx.type === "depot" || tx.type === "reception" ? tx.amount : -(tx.amount + (tx.fee ?? 0));
  let running = goal.saved - movements.reduce((sum, tx) => sum + delta(tx), 0);
  const points = movements.length ? [{ value: running, at: movements[0]?.at }] : [];
  for (const tx of movements) { running += delta(tx); points.push({ value: running, at: tx.at }); }
  if (!points.length) points.push({ value: goal.saved, at: undefined });
  const min = Math.min(0, ...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value), 1);
  const coords = points.map((p, index) => ({ ...p, x: points.length === 1 ? 150 : 10 + index * 280 / (points.length - 1), y: 130 - (p.value - min) / (max - min) * 110 }));
  const line = coords.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const date = (at: number | undefined) => at ? new Date(at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR") : "";
  return <div className="space-y-3">
    <h3 className="text-sm font-semibold">{t("Évolution de l’objectif")}</h3>
    <svg viewBox="0 0 300 150" className="w-full" role="img" aria-label={t("Évolution de l’objectif")}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand-blue)" stopOpacity="0.3" /><stop offset="100%" stopColor="var(--brand-blue)" stopOpacity="0" /></linearGradient></defs>
      {coords.length > 1 && <path d={`${line} L290,145 L10,145 Z`} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke="var(--brand-blue)" strokeWidth="2.5" />
      {coords.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--brand-green)"><title>{date(p.at)} · {formatMoney(p.value, goal.currency)}</title></circle>)}
    </svg>
    <div className="flex justify-between text-xs text-muted-foreground"><span>{date(points[0]?.at)}</span><span>{date(points[points.length - 1]?.at)}</span></div>
    {!movements.length && <p className="text-xs text-muted-foreground">{t("Aucun mouvement enregistré pour cet objectif.")}</p>}
  </div>;
}