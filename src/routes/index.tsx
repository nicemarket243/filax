import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Lock, Plus, Send, Users, Wallet } from "lucide-react";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { AccountSlider } from "@/components/filax/account-slider";
import { BankBadge, ProgressBar, SectionTitle, accentVar } from "@/components/filax/ui-kit";
import {
  ContributeModal,
  DepositModal,
  FundGoalModal,
  NewAccountModal,
  NewGoalModal,
  TransferModal,
  WithdrawModal,
} from "@/components/filax/action-modals";
import {
  formatDate,
  formatMoney,
  groupTotal,
  pct,
  useFilax,
  type AccentKey,
  type Goal,
  type Group,
} from "@/lib/filax-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FILAX — Épargnez et gérez votre argent intelligemment" },
      {
        name: "description",
        content:
          "FILAX : plateforme financière connectée à une banque partenaire. Épargne, objectifs, groupes de cotisation, transferts et Mobile Money.",
      },
      { property: "og:title", content: "FILAX — Plateforme financière intelligente" },
      { property: "og:description", content: "Épargnez, envoyez, recevez et organisez vos finances avec FILAX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const ACTIONS: { key: string; label: string; icon: typeof Wallet; color: AccentKey }[] = [
  { key: "deposit", label: "Dépôt", icon: ArrowDownLeft, color: "brand-green" },
  { key: "withdraw", label: "Retrait", icon: ArrowUpRight, color: "brand-red" },
  { key: "transfer", label: "Envoyer", icon: Send, color: "brand-blue" },
  { key: "account", label: "Compte", icon: Wallet, color: "brand-violet" },
];

function HomePage() {
  const filax = useFilax();
  const { accounts, goals, groups, transactions, profile } = filax.data;
  const [activeIndex, setActiveIndex] = useState(0);
  const [modal, setModal] = useState<string | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [group, setGroup] = useState<Group | null>(null);

  const active = accounts[activeIndex] ?? accounts[0];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader profile={profile} />

      <div className="mt-5">
        <p className="text-[0.75rem] text-muted-foreground">Bonjour {profile.firstName} 👋</p>
        <h1 className="text-[1.35rem] font-extrabold tracking-tight text-foreground">Votre argent, bien organisé</h1>
      </div>

      <div className="mt-5">
        <AccountSlider accounts={accounts} activeIndex={activeIndex} onActiveChange={setActiveIndex} />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2.5">
        {ACTIONS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            type="button"
            onClick={() => setModal(key)}
            className="press flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-3 soft-shadow"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: `color-mix(in oklab, ${accentVar(color)} 14%, transparent)` }}
            >
              <Icon className="h-4 w-4" style={{ color: accentVar(color) }} />
            </span>
            <span className="text-[0.65rem] font-semibold text-foreground">{label}</span>
          </button>
        ))}
      </div>

      <section className="mt-7">
        <SectionTitle
          title="Objectifs d'épargne"
          action={
            <button type="button" onClick={() => setModal("goal")} className="press flex items-center gap-1 text-[0.7rem] font-semibold text-brand-blue">
              <Plus className="h-3.5 w-3.5" /> Nouveau
            </button>
          }
        />
        <div className="space-y-2.5">
          {goals.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setGoal(g);
                setModal("fund");
              }}
              className="press block w-full rounded-2xl border border-border bg-surface p-3.5 text-left soft-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[0.82rem] font-bold text-foreground">
                  <span className="text-base">{g.icon}</span>
                  {g.name}
                </span>
                <span className="flex items-center gap-1 text-[0.62rem] text-muted-foreground">
                  <Lock className="h-3 w-3" /> {formatDate(g.deadline)}
                </span>
              </div>
              <div className="mt-2.5">
                <ProgressBar value={pct(g.saved, g.target)} color="brand-green" />
              </div>
              <p className="mt-1.5 text-[0.68rem] text-muted-foreground">
                {formatMoney(g.saved, g.currency)} sur {formatMoney(g.target, g.currency)} · {pct(g.saved, g.target)}%
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionTitle title="Groupes de cotisation" />
        <div className="space-y-2.5">
          {groups.map((g) => {
            const total = groupTotal(g);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setGroup(g);
                  setModal("contribute");
                }}
                className="press block w-full rounded-2xl border border-border bg-surface p-3.5 text-left soft-shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[0.82rem] font-bold text-foreground">
                    <span className="text-base">{g.icon}</span>
                    {g.name}
                  </span>
                  <span className="flex items-center gap-1 text-[0.62rem] text-muted-foreground">
                    <Users className="h-3 w-3" /> {g.members.length}
                  </span>
                </div>
                <div className="mt-2.5">
                  <ProgressBar value={pct(total, g.target)} color="brand-violet" />
                </div>
                <p className="mt-1.5 text-[0.68rem] text-muted-foreground">
                  {formatMoney(total, g.currency)} sur {formatMoney(g.target, g.currency)}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-7">
        <SectionTitle title="Dernières activités" />
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface soft-shadow">
          {transactions.slice(0, 6).map((t) => {
            const positive = t.type === "depot" || t.type === "reception";
            return (
              <div key={t.id} className="flex items-center justify-between px-3.5 py-3">
                <div className="leading-tight">
                  <p className="text-[0.78rem] font-semibold text-foreground">{t.label}</p>
                  <p className="text-[0.62rem] text-muted-foreground">{formatDate(t.at)}</p>
                </div>
                <span
                  className="text-[0.8rem] font-bold"
                  style={{ color: accentVar(positive ? "brand-green" : "brand-red") }}
                >
                  {positive ? "+" : "−"}
                  {formatMoney(t.amount, t.currency)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6">
        <BankBadge />
      </div>

      <DepositModal
        open={modal === "deposit"}
        onOpenChange={(o) => !o && setModal(null)}
        accounts={accounts}
        defaultAccountId={active?.id ?? ""}
        onConfirm={filax.deposit}
      />
      <WithdrawModal
        open={modal === "withdraw"}
        onOpenChange={(o) => !o && setModal(null)}
        accounts={accounts}
        defaultAccountId={active?.id ?? ""}
        onConfirm={filax.withdraw}
      />
      <TransferModal
        open={modal === "transfer"}
        onOpenChange={(o) => !o && setModal(null)}
        accounts={accounts}
        defaultAccountId={active?.id ?? ""}
        onConfirm={filax.transfer}
      />
      <NewAccountModal open={modal === "account"} onOpenChange={(o) => !o && setModal(null)} onConfirm={filax.createAccount} />
      <NewGoalModal open={modal === "goal"} onOpenChange={(o) => !o && setModal(null)} onConfirm={filax.createGoal} />
      <FundGoalModal
        open={modal === "fund"}
        onOpenChange={(o) => !o && setModal(null)}
        goal={goal}
        accounts={accounts}
        onConfirm={filax.fundGoal}
      />
      <ContributeModal
        open={modal === "contribute"}
        onOpenChange={(o) => !o && setModal(null)}
        group={group}
        accounts={accounts}
        onConfirm={filax.contribute}
      />

      <BottomNav />
    </main>
  );
}
