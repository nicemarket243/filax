import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { SectionTitle, accentVar } from "@/components/filax/ui-kit";
import { formatDate, formatMoney, useFilax, type Transaction } from "@/lib/filax-store";

export const Route = createFileRoute("/analyse")({
  head: () => ({
    meta: [
      { title: "Analyse de vos finances — FILAX" },
      { name: "description", content: "Visualisez vos entrées, sorties et l'évolution de votre épargne mois par mois." },
      { property: "og:title", content: "Analyse financière FILAX" },
      { property: "og:description", content: "Entrées, sorties et progression de votre épargne en un coup d'œil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalysePage,
});

function isIn(t: Transaction) {
  return t.type === "depot" || t.type === "reception";
}

function AnalysePage() {
  const { data } = useFilax();
  const { transactions, accounts, profile } = data;

  const usd = transactions.filter((t) => t.currency === "USD");
  const income = usd.filter(isIn).reduce((s, t) => s + t.amount, 0);
  const outcome = usd.filter((t) => !isIn(t)).reduce((s, t) => s + t.amount, 0);
  const totalUsd = accounts.filter((a) => a.currency === "USD").reduce((s, a) => s + a.balance, 0);

  // Répartition par compte (barres verticales).
  const maxBalance = Math.max(...accounts.map((a) => (a.currency === "USD" ? a.balance : a.balance / 2800)), 1);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />

      <PageTitle title="Analyse" subtitle="Comprendre où va votre argent." />


      <div className="mt-5 rounded-3xl p-5 text-white soft-shadow" style={{ background: "var(--gradient-blue)" }}>
        <p className="text-[0.7rem] text-white/80">Patrimoine total (USD)</p>
        <p className="mt-1 text-[2rem] font-extrabold leading-none tracking-tight">{formatMoney(totalUsd, "USD")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/15 p-3">
            <span className="flex items-center gap-1 text-[0.65rem] text-white/85">
              <ArrowDownLeft className="h-3 w-3" /> Entrées
            </span>
            <p className="mt-1 text-[0.95rem] font-bold">{formatMoney(income, "USD")}</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3">
            <span className="flex items-center gap-1 text-[0.65rem] text-white/85">
              <ArrowUpRight className="h-3 w-3" /> Sorties
            </span>
            <p className="mt-1 text-[0.95rem] font-bold">{formatMoney(outcome, "USD")}</p>
          </div>
        </div>
      </div>

      <section className="mt-7">
        <SectionTitle title="Répartition par compte" />
        <div className="rounded-3xl border border-border bg-surface p-4 soft-shadow">
          <div className="flex h-40 items-end justify-between gap-2">
            {accounts.map((a) => {
              const v = a.currency === "USD" ? a.balance : a.balance / 2800;
              return (
                <div key={a.id} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{ height: `${Math.max(6, (v / maxBalance) * 100)}%`, backgroundColor: accentVar(a.color) }}
                  />
                  <span className="text-base leading-none">{a.icon}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-7">
        <SectionTitle title="Historique complet" />
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface soft-shadow">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-3.5 py-3">
              <div className="leading-tight">
                <p className="text-[0.78rem] font-semibold text-foreground">{t.label}</p>
                <p className="text-[0.62rem] text-muted-foreground">
                  {formatDate(t.at)} · {t.reference}
                </p>
              </div>
              <span className="text-[0.8rem] font-bold" style={{ color: accentVar(isIn(t) ? "brand-green" : "brand-red") }}>
                {isIn(t) ? "+" : "−"}
                {formatMoney(t.amount, t.currency)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
