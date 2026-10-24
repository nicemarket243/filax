import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DISCOVERY_ACCOUNTS } from "@/lib/discovery-data";
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
import { DISCOVERY_KEY, PublicWelcome, type Discovery } from "@/components/filax/public-welcome";
import {
  DepositModal,
  FundGoalModal,
  NewAccountModal,
  NewGoalModal,
  TransferModal,
  WithdrawModal,
} from "@/components/filax/action-modals";
import { useDbAuthState,
  useDbNotifications, useDbAccounts, useDbTransactions, depositDb, withdrawDb, transferDb, transferExternalDb, useDbGoals, createGoalDb, fundGoalDb, useDbProfile, createDbAccount, setAccountVisualDb } from "@/lib/filax-db";
import { formatDate, formatMoney, isLocked, pct, useFilax, type AccentKey, type Goal } from "@/lib/filax-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FILAX — Épargnez et gérez votre argent intelligemment" },
      {
        name: "description",
        content:
          "FILAX : gestion de comptes, objectifs et groupes de cotisation. Connexions bancaires et Mobile Money en préparation.",
      },
      { property: "og:title", content: "FILAX — Plateforme financière intelligente" },
      { property: "og:description", content: "Épargnez, envoyez, recevez et organisez vos finances avec FILAX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const TX_TYPE_LABEL: Record<string, string> = { depot: "Dépôt", retrait: "Retrait", envoi: "Transfert envoyé", reception: "Transfert reçu", cotisation: "Cotisation" };

const ACTIONS: { key: string; label: string; icon: typeof Wallet; color: AccentKey }[] = [
  { key: "deposit", label: "Dépôt", icon: ArrowDownLeft, color: "brand-green" },
  { key: "withdraw", label: "Retrait", icon: ArrowUpRight, color: "brand-red" },
  { key: "transfer", label: "Transfert", icon: Send, color: "brand-blue" },
];

function HomePage() {
  const filax = useFilax();
  const { userId, ready } = useDbAuthState();
  const dbNotif = useDbNotifications(userId);
  const notifications = userId ? dbNotif.notifications ?? [] : [];
  const { profile: dbProfile } = useDbProfile(userId);
  const db = useDbAccounts(userId);
  const dbTx = useDbTransactions(userId, db.accounts);
  const live = !!userId && !!db.accounts && db.accounts.length > 0;
  const accounts = userId ? db.accounts ?? [] : DISCOVERY_ACCOUNTS;
  const dbGoals = useDbGoals(userId);
  const goals = userId ? dbGoals.goals ?? [] : [];
  const transactions = userId ? dbTx.transactions ?? [] : [];
  const reload = async () => {
    await db.refresh();
  };
  const [activeIndex, setActiveIndex] = useState(0);
  const [txDetail, setTxDetail] = useState<(typeof transactions)[number] | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [visualBusy, setVisualBusy] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [discovery, setDiscovery] = useState<Discovery | null | undefined>(undefined);
  useEffect(() => {
    try { setDiscovery(JSON.parse(localStorage.getItem(DISCOVERY_KEY) ?? "null")); } catch { setDiscovery(null); }
  }, []);
  const exitDiscovery = () => { localStorage.removeItem(DISCOVERY_KEY); setDiscovery(null); };

  const active = accounts[activeIndex] ?? accounts[0];
  const unread = notifications.filter((n) => !n.read).length;
  const accountTx = transactions.filter((t) => t.accountId === active?.id);
  const accountGoals = goals.filter((g) => g.accountId === active?.id);

  const openAction = (key: string) => {
    // Mode découverte : aucune session, donc aucune opération possible (le serveur refuse aussi sans compte vérifié).
    if (!userId && ["deposit", "withdraw", "transfer"].includes(key)) {
      toast.error("Opération indisponible en mode découverte", {
        description: "Créez et vérifiez votre compte (numéro, e-mail, identité et code PIN) pour faire des dépôts, retraits ou transferts.",
        duration: 8000,
        action: { label: "Compléter mon profil", onClick: exitDiscovery },
      });
      return;
    }
    if (key === "withdraw" && active && isLocked(active)) {
      lockedWithdrawToast();
      return;
    }
    setModal(key);
  };

  if (!ready || (!userId && discovery === undefined)) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" aria-label="Chargement" /></main>;
  }

  if (!userId && !discovery) return <PublicWelcome onAuthenticated={() => window.location.reload()} onDiscover={(d) => { localStorage.setItem(DISCOVERY_KEY, JSON.stringify(d)); setDiscovery(d); }} />;

  if (!active) return <main className="flex min-h-screen items-center justify-center bg-background"><p className="text-sm text-muted-foreground">{db.error ? "Impossible de charger vos comptes." : "Chargement de vos comptes…"}</p></main>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader
        unread={unread}
        onNotifications={() => {
          setModal("notifications");
          filax.markNotificationsRead();
        }}
      />
      {!userId && discovery && (
        <div role="status" className="mt-3 rounded-xl border border-brand-gold/40 bg-brand-gold/10 p-3 text-xs text-foreground">
          <p className="font-semibold">Mode découverte — données fictives</p>
          <p className="mt-1 text-muted-foreground">Bonjour {discovery.name}. Vos coordonnées ne sont pas vérifiées et aucun compte n'est créé. Les soldes affichés sont des exemples.</p>
          <button type="button" onClick={exitDiscovery} className="mt-2 font-semibold text-brand-blue underline-offset-2 hover:underline">Créer mon vrai compte</button>
        </div>
      )}


      <PageTitle
        title="Prenez le contrôle de vos finances"
        subtitle="Connexions bancaires et Mobile Money en préparation."
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
                  <button type="button" key={t.id} onClick={() => setTxDetail(t)} className="press flex w-full items-center justify-between rounded-2xl bg-muted/40 px-3 py-2.5 text-left">
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[0.76rem] font-semibold text-foreground">{t.label}</p>
                      <p className="text-[0.6rem] text-muted-foreground">
                        {TX_TYPE_LABEL[t.type] ?? t.type} · {formatDate(t.at)} · {active.name}
                      </p>
                    </div>
                    <span
                      className="text-[0.78rem] font-bold"
                      style={{ color: accentVar(positive ? "brand-green" : "brand-red") }}
                    >
                      {positive ? "+" : "−"}
                      {formatMoney(t.amount, t.currency)}
                    </span>
                  </button>
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
        requirePin={live}
        onConfirm={live ? async (id, amt, m, pin, gpin) => { await withdrawDb(id, amt, m, pin, gpin); await reload(); } : filax.withdraw}
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
      <Modal open={!!txDetail} onOpenChange={(o) => !o && setTxDetail(null)} title="Détail de l'opération" subtitle={txDetail?.label}>
        {txDetail && (
          <dl className="space-y-2">
            {[
              ["Type", TX_TYPE_LABEL[txDetail.type] ?? txDetail.type],
              ["Montant", `${txDetail.type === "depot" || txDetail.type === "reception" ? "+" : "−"}${formatMoney(txDetail.amount, txDetail.currency)}`],
              ["Date", new Date(txDetail.at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })],
              ["Compte concerné", accounts.find((a) => a.id === txDetail.accountId)?.name ?? active.name],
              ["Moyen", txDetail.method],
              ...(txDetail.origin ? [["Contrepartie", txDetail.origin]] : []),
              ["Référence", txDetail.reference],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-2xl bg-muted/50 px-3 py-2.5">
                <dt className="text-[0.7rem] text-muted-foreground">{k}</dt>
                <dd className="text-[0.78rem] font-bold text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
      <NotificationsModal
        open={modal === "notifications"}
        onOpenChange={(o) => !o && setModal(null)}
        notifications={notifications}
        onClear={userId ? () => void dbNotif.markAllRead() : filax.clearNotifications}
      />

      <BottomNav />
    </main>
  );
}
