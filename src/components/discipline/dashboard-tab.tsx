import {
  Lock,
  Swords,
  CalendarClock,
  ChevronRight,
  Smartphone,
  Globe,
  Flame,
  Clock,
  History,
} from "lucide-react";
import {
  type DisciplineData,
  formatCountdown,
  remainingMs,
  reliabilityScore,
} from "./store";
import { useTick } from "@/hooks/use-tick";
import { CommandBar } from "./command-bar";
import { DrawerSection } from "./drawer-section";
import type { ParsedIntent } from "@/hooks/use-voice-command";

type Tab = "dashboard" | "blocages" | "duel" | "programmes";

interface DashboardTabProps {
  data: DisciplineData;
  onVoiceIntent: (intent: ParsedIntent) => void;
  onNavigate: (tab: Tab) => void;
}

/**
 * Tableau de bord Discipline — point d'entrée principal.
 * Vue générale des derniers blocages et de l'activité récente, tout rangé
 * dans des tiroirs. Aucun minuteur affiché directement à l'ouverture.
 */
export function DashboardTab({ data, onVoiceIntent, onNavigate }: DashboardTabProps) {
  useTick(1000);

  const activeBlocks = data.blocks.length;
  const activeDuels = data.duels.filter((d) => d.status === "en_cours").length;
  const upcoming = data.programs.filter((p) => p.at > Date.now()).length;
  const score = reliabilityScore(data.duels);

  const nextProgram = [...data.programs].filter((p) => p.at > Date.now()).sort((a, b) => a.at - b.at)[0];

  const STATS: { label: string; value: string; icon: typeof Lock; tab: Tab; color: string }[] = [
    { label: "Blocages actifs", value: String(activeBlocks), icon: Lock, tab: "blocages", color: "text-brand-green" },
    { label: "Défis en cours", value: String(activeDuels), icon: Swords, tab: "duel", color: "text-brand-gold" },
    { label: "Programmes à venir", value: String(upcoming), icon: CalendarClock, tab: "programmes", color: "text-brand-blue" },
    { label: "Score de fiabilité", value: `${score}%`, icon: Flame, tab: "duel", color: "text-brand-violet" },
  ];

  return (
    <div className="space-y-5 pb-32">
      {/* CARTE COMMANDE IA — compacte */}
      <CommandBar onIntent={onVoiceIntent} />

      {/* VUE GÉNÉRALE */}
      <section className="grid grid-cols-2 gap-3">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => onNavigate(s.tab)}
              className="rounded-2xl bg-white/[0.03] p-4 text-left transition-all active:scale-[0.97] hover:bg-white/[0.05]"
            >
              <Icon className={`h-5 w-5 ${s.color}`} />
              <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-[0.66rem] text-muted-foreground">{s.label}</p>
            </button>
          );
        })}
      </section>

      {/* PROCHAIN PROGRAMME */}
      {nextProgram && (
        <button
          onClick={() => onNavigate("programmes")}
          className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.03] p-4 text-left transition-all active:scale-[0.98] hover:bg-white/[0.05]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/12 text-brand-blue">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.62rem] uppercase tracking-widest text-muted-foreground">Prochain programme</p>
            <p className="truncate text-sm font-semibold text-foreground">{nextProgram.title}</p>
            <p className="text-[0.68rem] text-muted-foreground">
              {new Date(nextProgram.at).toLocaleString("fr-FR", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* DERNIERS BLOCAGES — tiroir */}
      <DrawerSection
        icon={<Lock className="h-4 w-4" />}
        title="Derniers blocages"
        count={data.blocks.length}
        defaultOpen
        iconClass="bg-brand-green/12 text-brand-green"
      >
        {data.blocks.length === 0 ? (
          <p className="px-1 py-2 text-center text-[0.72rem] text-muted-foreground">Aucun blocage actif.</p>
        ) : (
          <div className="space-y-2">
            {data.blocks.slice(0, 5).map((b) => {
              const ms = remainingMs(b.startedAt, b.durationDays);
              return (
                <button
                  key={b.id}
                  onClick={() => onNavigate("blocages")}
                  className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] p-3 text-left active:scale-[0.98]"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      b.kind === "app" ? "bg-brand-green/12 text-brand-green" : "bg-brand-blue/12 text-brand-blue"
                    }`}
                  >
                    {b.kind === "app" ? <Smartphone className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{b.name}</span>
                    <span className="flex items-center gap-1 text-[0.68rem] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {ms <= 0 ? "Terminé" : formatCountdown(ms)}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </DrawerSection>

      {/* ACTIVITÉ RÉCENTE — tiroir */}
      <DrawerSection
        icon={<History className="h-4 w-4" />}
        title="Activité récente"
        count={data.history.length}
        iconClass="bg-white/[0.06] text-muted-foreground"
      >
        {data.history.length === 0 ? (
          <p className="px-1 py-2 text-center text-[0.72rem] text-muted-foreground">Aucune activité pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {data.history.slice(0, 6).map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground">
                  {h.kind === "app" ? <Smartphone className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{h.name}</p>
                  <p className="text-[0.68rem] text-muted-foreground">
                    {h.reason === "completed" ? "Blocage terminé" : "Blocage levé"} ·{" "}
                    {new Date(h.endedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DrawerSection>
    </div>
  );
}
