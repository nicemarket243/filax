import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Home, BarChart3, Settings } from "lucide-react";

import { BackButton } from "@/components/back-button";
import { useEconomieStore, type Account } from "@/components/economie/store";
import { AccueilTab } from "@/components/economie/accueil-tab";
import { AnalyseTab } from "@/components/economie/analyse-tab";
import { GestionTab } from "@/components/economie/gestion-tab";
import { DepositModal } from "@/components/economie/deposit-modal";
import { WithdrawModal } from "@/components/economie/withdraw-modal";
import { LockModal } from "@/components/economie/lock-modal";
import { GoalModal } from "@/components/economie/goal-modal";
import { GroupModal } from "@/components/economie/group-modal";
import { TransferModal } from "@/components/economie/transfer-modal";
import { takePendingIntent, num, str } from "@/lib/pending-intent";

export const Route = createFileRoute("/economie")({
  head: () => ({
    meta: [
      { title: "FILAX Économie — Banque numérique premium" },
      {
        name: "description",
        content: "FILAX Économie : épargnez, déposez, retirez, verrouillez vos fonds et atteignez vos objectifs financiers.",
      },
      { property: "og:title", content: "FILAX Économie" },
      {
        property: "og:description",
        content: "Le centre financier premium de l'écosystème FILAX : épargne, objectifs et groupes.",
      },
    ],
  }),
  component: EconomiePage,
});

type Tab = "accueil" | "analyse" | "gestion";

const TABS: { key: Tab; label: string; icon: typeof Home; color: string }[] = [
  { key: "accueil", label: "Accueil", icon: Home, color: "text-brand-green" },
  { key: "analyse", label: "Analyse", icon: BarChart3, color: "text-brand-blue" },
  { key: "gestion", label: "Gestion", icon: Settings, color: "text-brand-gold" },
];

function EconomiePage() {
  const store = useEconomieStore();
  const [tab, setTab] = useState<Tab>("accueil");
  const [activeIndex, setActiveIndex] = useState(0);

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [lockAccount, setLockAccount] = useState<Account | null>(null);

  const activeAccount = store.data.accounts[activeIndex] ?? store.data.accounts[0];

  // Exécute une intention déposée par l'Orchestrateur Central (page d'accueil).
  useEffect(() => {
    if (!store.ready) return;
    const intent = takePendingIntent("economie");
    if (!intent) return;
    const p = intent.params;
    const wanted = str(p.accountName).toLowerCase();
    const idx = wanted
      ? store.data.accounts.findIndex((a) => a.name.toLowerCase().includes(wanted) || wanted.includes(a.name.toLowerCase()))
      : -1;
    const target = idx >= 0 ? store.data.accounts[idx] : activeAccount;
    if (idx >= 0) setActiveIndex(idx);

    if (intent.action === "lock_account" && target) {
      const days = num(p.durationDays, 30);
      store.lockAccount(target.id, Date.now() + days * 86_400_000);
      setTab("accueil");
      toast.success(`${target.name} verrouillé`, { description: `Pendant ${days} jours` });
    } else if (intent.action === "deposit") {
      setTab("accueil");
      setDepositOpen(true);
    } else if (intent.action === "withdraw") {
      setTab("accueil");
      setWithdrawOpen(true);
    } else if (intent.action === "transfer") {
      setTab("accueil");
      setTransferOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.ready]);


  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <BackButton fallbackTo="/" />
      </header>

      <div className="mt-5 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          FILAX <span className="text-brand-green">Économie</span>
        </h1>
        <p className="mt-1 text-[0.78rem] text-muted-foreground">Votre banque numérique premium.</p>
      </div>

      <div className="mt-6 animate-fade-up">
        {tab === "accueil" && (
          <AccueilTab
            data={store.data}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            onRename={store.renameAccount}
            onDeposit={() => setDepositOpen(true)}
            onWithdraw={() => setWithdrawOpen(true)}
            onTransfer={() => setTransferOpen(true)}
            onLock={(acc) => setLockAccount(acc)}
          />
        )}
        {tab === "analyse" && <AnalyseTab data={store.data} />}
        {tab === "gestion" && (
          <GestionTab
            data={store.data}
            onCreateGoal={() => setGoalOpen(true)}
            onCreateGroup={() => setGroupOpen(true)}
            onFundGoal={store.fundGoal}
            onToggleMember={store.toggleMemberPaid}
            onAddMember={store.addMember}
            onRecordContribution={store.recordContribution}
            onToggleLike={store.toggleMemberLike}
          />
        )}
      </div>

      {/* MODALS */}
      <DepositModal
        open={depositOpen}
        onOpenChange={setDepositOpen}
        accounts={store.data.accounts}
        defaultAccountId={activeAccount?.id ?? ""}
        onConfirm={store.deposit}
      />
      <WithdrawModal
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        accounts={store.data.accounts}
        defaultAccountId={activeAccount?.id ?? ""}
        onConfirm={store.withdraw}
      />
      <LockModal open={!!lockAccount} onOpenChange={(o) => !o && setLockAccount(null)} account={lockAccount} onConfirm={store.lockAccount} />
      <GoalModal open={goalOpen} onOpenChange={setGoalOpen} onConfirm={store.addGoal} />
      <GroupModal open={groupOpen} onOpenChange={setGroupOpen} onConfirm={store.addGroup} />
      <TransferModal
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={store.data.accounts}
        defaultAccountId={activeAccount?.id ?? ""}
        onConfirm={store.withdraw}
      />

      {/* FLOATING BOTTOM NAV */}
      <nav className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 items-center justify-around rounded-full border border-white/10 bg-card/80 p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[0.62rem] font-semibold transition-all ${
                active ? "bg-white/[0.08] text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? t.color : ""}`} />
              {t.label}
            </button>
          );
        })}
      </nav>
    </main>
  );
}
