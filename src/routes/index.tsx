import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  LineChart,
  Lock,
  Send,
  Target,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { PremiumCard, lockedWithdrawToast } from "@/components/filax/premium-card";
import { AllAccountsModal } from "@/components/filax/all-accounts-modal";
import { NotificationsModal } from "@/components/filax/notifications";
import { AccountChart } from "@/components/filax/account-chart";
import { Coffre } from "@/components/filax/coffre";
import { BankBadge, ProgressBar, accentVar } from "@/components/filax/ui-kit";
import {
  ContributeModal,
  DepositModal,
  FundGoalModal,
  NewAccountModal,
  NewGoalModal,
  NewGroupModal,
  TransferModal,
  WithdrawModal,
} from "@/components/filax/action-modals";
import {
  formatDate,
  formatMoney,
  groupTotal,
  isLocked,
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
  { key: "transfer", label: "Transfert", icon: Send, color: "brand-blue" },
  { key: "account", label: "Compte", icon: Wallet, color: "brand-blue" },
  { key: "group", label: "Groupe", icon: UserPlus, color: "brand-blue" },
  { key: "history", label: "Historique", icon: History, color: "brand-blue" },
];

function HomePage() {
  const filax = useFilax();
  const { accounts, goals, groups, transactions, notifications } = filax.data;
  const [activeIndex, setActiveIndex] = useState(0);
  const [modal, setModal] = useState<string | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [group, setGroup] = useState<Group | null>(null);

  const active = accounts[activeIndex] ?? accounts[0]!;
  const unread = notifications.filter((n) => !n.read).length;
  const accountTx = transactions.filter((t) => t.accountId === active.id);
  const accountGoals = goals.filter((g) => g.accountId === active.id);

  const openAction = (key: string) => {
    if (key === "withdraw" && isLocked(active)) {
      lockedWithdrawToast();
      return;
    }
    if (key === "history") {
      document.getElementById("filax-historique")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setModal(key);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader
        unread={unread}
        onNotifications={() => {
          setModal("notifications");
          filax.markNotificationsRead();
        }}
      />

      <PageTitle
        title="Prenez le contrôle de vos finances"
        subtitle="Vos fonds sont sécurisés par notre banque partenaire."
      />


      <div className="mt-5">
        <PremiumCard
          account={active}
          index={activeIndex}
          total={accounts.length}
          onNext={() => setActiveIndex((i) => (i + 1) % accounts.length)}
          onShowAll={() => setModal("all")}
          onCreate={() => setModal("account")}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {ACTIONS.map(({ key, label, icon: Icon, color }) => {
          const disabled = key === "withdraw" && isLocked(active);
          return (
            <button
              key={key}
              type="button"
              onClick={() => openAction(key)}
              className="press flex flex-col items-center gap-1.5 rounded-2xl bg-surface py-3 soft-shadow"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: disabled
                    ? "var(--muted)"
                    : `color-mix(in oklab, ${accentVar(color)} 14%, transparent)`,
                }}
              >
                <Icon className="h-4 w-4" style={{ color: disabled ? "var(--muted-foreground)" : accentVar(color) }} />
              </span>
              <span
                className="text-[0.65rem] font-semibold"
                style={{ color: disabled ? "var(--muted-foreground)" : "var(--foreground)" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        <Coffre
          title="Objectifs d'épargne"
          subtitle={active.name}
          icon={<Target className="h-4 w-4" />}
          badge={`${accountGoals.length}`}
        >
          <div className="space-y-2.5">
            {accountGoals.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setGoal(g);
                  setModal("fund");
                }}
                className="press block w-full rounded-2xl bg-muted/50 p-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[0.8rem] font-bold text-foreground">
                    <span className="text-base">{g.icon}</span>
                    {g.name}
                  </span>
                  <span className="flex items-center gap-1 text-[0.6rem] text-muted-foreground">
                    <Lock className="h-3 w-3" /> {formatDate(g.deadline)}
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={pct(g.saved, g.target)} color="brand-green" />
                </div>
                <p className="mt-1.5 text-[0.66rem] text-muted-foreground">
                  {formatMoney(g.saved, g.currency)} sur {formatMoney(g.target, g.currency)} · {pct(g.saved, g.target)}%
                </p>
              </button>
            ))}
            {accountGoals.length === 0 && (
              <p className="rounded-2xl bg-muted/50 px-3 py-4 text-center text-[0.7rem] text-muted-foreground">
                Aucun objectif sur ce compte pour l'instant.
              </p>
            )}
            <button
              type="button"
              onClick={() => setModal("goal")}
              className="press w-full rounded-xl border border-dashed border-border py-2.5 text-[0.7rem] font-semibold text-brand-blue"
            >
              + Nouvel objectif
            </button>
          </div>
        </Coffre>

        <Coffre
          title="Groupes de cotisation"
          subtitle="Épargnez à plusieurs"
          icon={<Users className="h-4 w-4" />}
          badge={`${groups.length}`}
        >
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
                  className="press block w-full rounded-2xl bg-muted/50 p-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[0.8rem] font-bold text-foreground">
                      <span className="text-base">{g.icon}</span>
                      {g.name}
                    </span>
                    <span className="flex -space-x-2">
                      {g.members.slice(0, 4).map((m) => (
                        <img key={m.id} src={m.avatar} alt={m.name} className="h-6 w-6 rounded-full ring-2 ring-surface" />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.64rem] text-muted-foreground">{g.description}</p>
                  <div className="mt-2">
                    <ProgressBar value={pct(total, g.target)} color="brand-blue" />
                  </div>
                  <p className="mt-1.5 text-[0.66rem] text-muted-foreground">
                    {formatMoney(total, g.currency)} sur {formatMoney(g.target, g.currency)} · {g.members.length} membres
                  </p>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setModal("group")}
              className="press w-full rounded-xl border border-dashed border-border py-2.5 text-[0.7rem] font-semibold text-brand-blue"
            >
              + Nouveau groupe
            </button>
          </div>
        </Coffre>

        <div id="filax-historique">
          <Coffre
            title="Historique"
            subtitle="Tous vos mouvements"
            icon={<History className="h-4 w-4" />}
            badge={`${transactions.length}`}
          >
            <div className="divide-y divide-border overflow-hidden rounded-2xl bg-muted/40">
              {transactions.map((t) => {
                const positive = t.type === "depot" || t.type === "reception";
                return (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2.5">
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[0.76rem] font-semibold text-foreground">{t.label}</p>
                      <p className="text-[0.6rem] text-muted-foreground">
                        {formatDate(t.at)} · {t.reference}
                      </p>
                    </div>
                    <span
                      className="text-[0.78rem] font-bold"
                      style={{ color: accentVar(positive ? "brand-green" : "brand-red") }}
                    >
                      {positive ? "+" : "−"}
                      {formatMoney(t.amount, t.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Coffre>
        </div>

        <Coffre
          title="Analyse financière"
          subtitle={active.name}
          icon={<LineChart className="h-4 w-4" />}
          badge={`${accountTx.length} op.`}
        >
          <AccountChart account={active} transactions={transactions} />
        </Coffre>
      </div>

      <div className="mt-6">
        <BankBadge />
      </div>

      <DepositModal
        open={modal === "deposit"}
        onOpenChange={(o) => !o && setModal(null)}
        accounts={accounts}
        defaultAccountId={active.id}
        onConfirm={filax.deposit}
      />
      <WithdrawModal
        open={modal === "withdraw"}
        onOpenChange={(o) => !o && setModal(null)}
        accounts={accounts}
        defaultAccountId={active.id}
        onConfirm={filax.withdraw}
      />
      <TransferModal
        open={modal === "transfer"}
        onOpenChange={(o) => !o && setModal(null)}
        accounts={accounts}
        defaultAccountId={active.id}
        onConfirm={filax.transfer}
      />
      <NewAccountModal open={modal === "account"} onOpenChange={(o) => !o && setModal(null)} onConfirm={filax.createAccount} />
      <NewGroupModal open={modal === "group"} onOpenChange={(o) => !o && setModal(null)} onConfirm={filax.createGroup} />
      <NewGoalModal
        open={modal === "goal"}
        onOpenChange={(o) => !o && setModal(null)}
        onConfirm={(g) => filax.createGoal({ ...g, accountId: active.id, currency: active.currency })}
      />

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
      <AllAccountsModal
        open={modal === "all"}
        onOpenChange={(o) => !o && setModal(null)}
        accounts={accounts}
        activeId={active.id}
        onSelect={setActiveIndex}
      />
      <NotificationsModal
        open={modal === "notifications"}
        onOpenChange={(o) => !o && setModal(null)}
        notifications={notifications}
        onClear={filax.clearNotifications}
      />

      <BottomNav />
    </main>
  );
}
