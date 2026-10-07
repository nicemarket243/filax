import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { discardFreshGoogleAccount } from "@/lib/filax-auth.functions";
import { ArrowDownLeft, ArrowUpRight, BadgeCheck, History, LineChart, Lock, Send, ShieldAlert, ShieldCheck, Target, Wallet } from "lucide-react";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { PremiumCard, lockedWithdrawToast } from "@/components/filax/premium-card";
import { AllAccountsModal } from "@/components/filax/all-accounts-modal";
import { NotificationsModal } from "@/components/filax/notifications";
import { AccountChart } from "@/components/filax/account-chart";
import { Coffre } from "@/components/filax/coffre";
import { BankBadge, PageTitle, ProgressBar, accentVar } from "@/components/filax/ui-kit";
import { VisualPicker } from "@/components/filax/visual-picker";
import { Modal } from "@/components/filax/ui-kit";
import { Glyph } from "@/components/filax/glyph";
import { AUTH_INTENT_KEY, PublicWelcome } from "@/components/filax/public-welcome";
import {
  DepositModal,
  FundGoalModal,
  NewAccountModal,
  NewGoalModal,
  TransferModal,
  WithdrawModal,
} from "@/components/filax/action-modals";
import { useDbAuthState, useDbAccounts, useDbTransactions, depositDb, withdrawDb, transferDb, transferExternalDb, useDbGoals, createGoalDb, fundGoalDb, useDbProfile, createDbAccount, setAccountVisualDb } from "@/lib/filax-db";
import { formatDate, formatMoney, isLocked, pct, useFilax, type AccentKey, type Goal } from "@/lib/filax-store";

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
];

function HomePage() {
  const filax = useFilax();
  const { notifications } = filax.data;
  const { userId, ready } = useDbAuthState();
  const { profile: dbProfile } = useDbProfile(userId);
  const db = useDbAccounts(userId);
  const dbTx = useDbTransactions(userId, db.accounts);
  const live = !!userId && !!db.accounts && db.accounts.length > 0;
  const accounts = live && db.accounts ? db.accounts : filax.data.accounts;
  const dbGoals = useDbGoals(userId);
  const goals = live ? dbGoals.goals ?? [] : filax.data.goals;
  const transactions = live ? dbTx.transactions ?? [] : filax.data.transactions;
  const reload = async () => {
    await db.refresh();
  };
  const [activeIndex, setActiveIndex] = useState(0);
  const [modal, setModal] = useState<string | null>(null);
  const [visualBusy, setVisualBusy] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [checkingLogin, setCheckingLogin] = useState(false);
  const discardFresh = useServerFn(discardFreshGoogleAccount);

  // Connexion Google : un Gmail non lié à un compte FILAX ne doit jamais ouvrir un profil vide.
  useEffect(() => {
    if (!userId) return;
    if (sessionStorage.getItem(AUTH_INTENT_KEY) !== "login") return;
    sessionStorage.removeItem(AUTH_INTENT_KEY);
    setCheckingLogin(true);
    void (async () => {
      try {
        const r = await discardFresh();
        if (r.discarded) {
          await supabase.auth.signOut();
          toast.error("Aucun compte FILAX lié à ce Gmail", {
            description: `${r.email ?? "Cette adresse"} n'a pas de compte. Choisissez l'adresse Gmail de votre compte ou connectez-vous avec votre ID FILAX.`,
            duration: 9000,
          });
        }
      } finally {
        setCheckingLogin(false);
      }
    })();
  }, [userId, discardFresh]);

  const active = accounts[activeIndex] ?? accounts[0];
  if (!active) return <main aria-label="Chargement" />;
  const unread = notifications.filter((n) => !n.read).length;
  const accountTx = transactions.filter((t) => t.accountId === active.id);
  const accountGoals = goals.filter((g) => g.accountId === active.id);

  const openAction = (key: string) => {
    if (key === "withdraw" && isLocked(active)) {
      lockedWithdrawToast();
      return;
    }
    setModal(key);
  };

  if (!ready || checkingLogin) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" aria-label="Chargement" /></main>;
  }

  if (!userId) return <PublicWelcome onAuthenticated={() => window.location.reload()} />;

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
          onChangeVisual={() => setModal("visual")}
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
                    <Glyph icon={g.icon} className="h-4 w-4 text-brand-green" />
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


        <div id="filax-historique">
          <Coffre
            title="Historique"
            subtitle={active.name}
            icon={<History className="h-4 w-4" />}
            badge={`${accountTx.length}`}
          >
            <div className="space-y-2">
              {accountTx.map((t) => {
                const positive = t.type === "depot" || t.type === "reception";
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2.5">
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[0.76rem] font-semibold text-foreground">{t.label}</p>
                      <p className="text-[0.6rem] text-muted-foreground">
                        {formatDate(t.at)} · {t.origin ?? t.reference}
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
              {accountTx.length === 0 && (
                <p className="rounded-2xl bg-muted/40 px-3 py-4 text-center text-[0.7rem] text-muted-foreground">
                  Aucune opération sur ce compte.
                </p>
              )}
            </div>
          </Coffre>
        </div>

        <Coffre
          title="Analyse financière"
          subtitle={active.name}
          icon={<LineChart className="h-4 w-4" />}
          badge={`${accountTx.length} op.`}
        >
          <AccountChart account={active} transactions={accountTx} />
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
        onConfirm={live ? async (id, amt, m) => { await depositDb(id, amt, m); await reload(); } : filax.deposit}
      />
      <WithdrawModal
        open={modal === "withdraw"}
        onOpenChange={(o) => !o && setModal(null)}
        accounts={accounts}
        defaultAccountId={active.id}
        onConfirm={live ? async (id, amt, m, pin) => { await withdrawDb(id, amt, m, pin); await reload(); } : filax.withdraw}
      />
      <TransferModal
        open={modal === "transfer"}
        onOpenChange={(o) => !o && setModal(null)}
        accounts={accounts}
        defaultAccountId={active.id}
        requirePin={live}
        onConfirm={
          live
            ? async (id, amt, label, extra) => {
                if (extra?.external) await transferExternalDb(id, amt, label, extra.pin ?? "", extra.accountPin ?? "");
                else await transferDb(id, amt, extra?.filaxId ?? "", extra?.pin ?? "", extra?.accountPin ?? "");
                await reload();
              }
            : filax.transfer
        }
      />
      <NewAccountModal open={modal === "account"} accounts={accounts} defaultParentId={active.parentAccountId ?? active.id} onOpenChange={(o) => !o && setModal(null)} onConfirm={async (input) => { if (!userId) throw new Error("Connectez-vous pour créer un sous-compte"); await createDbAccount(input); await reload(); }} />
      <Modal open={modal === "visual"} onOpenChange={(o) => !o && setModal(null)} title="Choisir le visuel">
        <VisualPicker value={active.visualKey ?? ""} disabled={visualBusy} onChange={async (key) => {
          if (visualBusy) return;
          setVisualBusy(true);
          try { if (!userId) throw new Error("Non connecté"); await setAccountVisualDb(active.id, key); await reload(); setModal(null); toast.success("Visuel enregistré"); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Enregistrement impossible"); }
          finally { setVisualBusy(false); }
        }} />
      </Modal>
      
      <NewGoalModal
        open={modal === "goal"}
        onOpenChange={(o) => !o && setModal(null)}
        onConfirm={(g) => live ? createGoalDb(userId ?? "", { ...g, accountId: active.id, currency: active.currency }).then(() => dbGoals.refresh()) : filax.createGoal({ ...g, accountId: active.id, currency: active.currency })}
      />

      <FundGoalModal
        open={modal === "fund"}
        onOpenChange={(o) => !o && setModal(null)}
        goal={goal}
        accounts={accounts}
        onConfirm={live ? async (gid, amt, acc, pin) => { await fundGoalDb(gid, amt, acc, pin); await Promise.all([dbGoals.refresh(), reload()]); } : filax.fundGoal}
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
