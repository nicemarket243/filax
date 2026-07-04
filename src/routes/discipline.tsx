import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Swords, CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { BackButton } from "@/components/back-button";
import {
  useDisciplineStore,
  remainingMs,
} from "@/components/discipline/store";
import { BlocagesTab } from "@/components/discipline/blocages-tab";
import { DuelTab } from "@/components/discipline/duel-tab";
import { ProgrammesTab } from "@/components/discipline/programmes-tab";
import type { ParsedIntent } from "@/hooks/use-voice-command";

export const Route = createFileRoute("/discipline")({
  head: () => ({
    meta: [
      { title: "FILAX Discipline" },
      {
        name: "description",
        content: "FILAX Discipline : blocages, duels de productivité et programmes pilotés par l'IA.",
      },
      { property: "og:title", content: "FILAX Discipline" },
      {
        property: "og:description",
        content: "Blocages d'applications, duels de productivité et programmes intelligents.",
      },
    ],
  }),
  component: DisciplinePage,
});

type Tab = "blocages" | "duel" | "programmes";

const TABS: { key: Tab; label: string; icon: typeof Lock; color: string }[] = [
  { key: "blocages", label: "Blocages", icon: Lock, color: "text-brand-green" },
  { key: "duel", label: "Duel", icon: Swords, color: "text-brand-green" },
  { key: "programmes", label: "Programmes", icon: CalendarClock, color: "text-brand-violet" },
];

function DisciplinePage() {
  const store = useDisciplineStore();
  const [tab, setTab] = useState<Tab>("blocages");
  const [pendingAi, setPendingAi] = useState<string>("");

  const activeBlock = store.data.blocks.find((b) => remainingMs(b.startedAt, b.durationDays) > 0);

  const handleVoiceIntent = (intent: ParsedIntent) => {
    if (intent.module === "blocages") {
      store.addBlock({ name: intent.target, kind: "app", durationDays: intent.durationDays ?? 30 });
      setTab("blocages");
      toast.success(`IA → Blocage : ${intent.target}`, {
        description: `${intent.durationDays ?? 30} jours`,
      });
    } else if (intent.module === "paris") {
      store.addDuel({
        title: "Défi vocal",
        opponent: "Ami",
        stake: intent.amount ?? 20,
        durationDays: intent.durationDays ?? 3,
      });
      setTab("duel");
      toast.success(`IA → Duel de ${intent.amount ?? 20}$ créé`);
    } else if (intent.module === "programmes") {
      setPendingAi(intent.title);
      setTab("programmes");
      toast.success("IA → Programme", { description: "Complétez la création dans l'onglet Programmes." });
    } else {
      toast("Commande non reconnue", { description: `« ${intent.raw} »` });
    }
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <BackButton fallbackTo="/" />
      </header>

      <div className="mt-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          FILAX <span className="text-brand-green">Discipline</span>
        </h1>
        <p className="mt-1 text-[0.78rem] text-muted-foreground">
          Bloquez, engagez-vous, planifiez — pilotés par l'IA vocale.
        </p>
      </div>

      <div className="mt-6 animate-fade-up">
        {tab === "blocages" && (
          <BlocagesTab
            data={store.data}
            addBlock={store.addBlock}
            updateBlock={store.updateBlock}
            removeBlock={store.removeBlock}
            onVoiceIntent={handleVoiceIntent}
            activeBetTitle={activeBet?.title}
          />
        )}
        {tab === "paris" && (
          <ParisTab
            data={store.data}
            addBet={store.addBet}
            updateBet={store.updateBet}
            onVoiceIntent={handleVoiceIntent}
          />
        )}
        {tab === "programmes" && (
          <ProgrammesTab
            data={store.data}
            addProgram={store.addProgram}
            removeProgram={store.removeProgram}
            onVoiceIntent={handleVoiceIntent}
            pendingAiText={pendingAi}
            onConsumeAi={() => setPendingAi("")}
          />
        )}
      </div>

      {/* FLOATING BOTTOM NAV */}
      <nav className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 items-center justify-around rounded-full border border-white/10 bg-card/80 p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
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
