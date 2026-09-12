import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { History } from "lucide-react";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { AccountChart } from "@/components/filax/account-chart";
import { Coffre } from "@/components/filax/coffre";
import { Glyph } from "@/components/filax/glyph";
import { PageTitle, accentVar } from "@/components/filax/ui-kit";
import { formatDate, formatMoney, useFilax, type Transaction } from "@/lib/filax-store";

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

function isIn(t: Transaction) {
  return t.type === "depot" || t.type === "reception";
}

function AnalysePage() {
  const { data } = useFilax();
  const { transactions, accounts } = data;
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = accounts.find((a) => a.id === activeId) ?? accounts[0]!;
  const accountTx = transactions.filter((t) => t.accountId === active.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />

      <PageTitle title="Analyse" subtitle="Comprendre où va l'argent de chaque compte." />

      {/* Sélecteur de compte : toutes les données ci-dessous suivent ce choix. */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {accounts.map((a) => {
          const on = a.id === active.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveId(a.id)}
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
        style={{ background: `linear-gradient(140deg, ${accentVar(active.color)}, color-mix(in oklab, ${accentVar(active.color)} 45%, #05070f))` }}
      >
        <p className="text-[0.7rem] text-white/80">{active.name}</p>
        <p className="mt-1 text-[1.9rem] font-extrabold leading-none tracking-tight">
          {formatMoney(active.balance, active.currency)}
        </p>
        <p className="mt-2 text-[0.65rem] text-white/80">{accountTx.length} opération(s) enregistrée(s)</p>
      </div>

      <div className="mt-5">
        <AccountChart account={active} transactions={accountTx} />
      </div>

      <div className="mt-5">
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
                    {formatDate(t.at)} · {t.origin ?? t.reference}
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
