import { useState } from "react";
import {
  Swords,
  Plus,
  Clock,
  Trophy,
  Flame,
  Coins,
  ShieldCheck,
  ChevronRight,
  Check,
  X,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type Duel,
  type DisciplineData,
  DURATION_PRESETS,
  formatCountdown,
  remainingMs,
  reliabilityScore,
  commonPot,
} from "./store";
import { useTick } from "@/hooks/use-tick";
import { VoiceButton } from "./voice-button";
import type { ParsedIntent } from "@/hooks/use-voice-command";

interface DuelTabProps {
  data: DisciplineData;
  addDuel: (b: Omit<Duel, "id" | "startedAt" | "myProgress" | "oppProgress" | "status">) => void;
  updateDuel: (id: string, patch: Partial<Duel>) => void;
  removeDuel: (id: string) => void;
  onVoiceIntent: (intent: ParsedIntent) => void;
}

/** Barre de progression néon verte, sans bordure. */
function ProgressBar({ value, tone = "green" }: { value: number; tone?: "green" | "muted" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background:
            tone === "green"
              ? "linear-gradient(90deg, oklch(0.72 0.22 140), oklch(0.8 0.2 150))"
              : "linear-gradient(90deg, oklch(0.6 0.02 255), oklch(0.7 0.02 255))",
          boxShadow: tone === "green" ? "0 0 12px -2px oklch(0.72 0.22 140 / 0.7)" : "none",
        }}
      />
    </div>
  );
}

export function DuelTab({ data, addDuel, updateDuel, removeDuel, onVoiceIntent }: DuelTabProps) {
  useTick(1000);
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [stake, setStake] = useState("50");
  const [durDays, setDurDays] = useState(3);

  const score = reliabilityScore(data.duels);
  const pot = commonPot(data.duels);
  const activeCount = data.duels.filter((d) => d.status === "en_cours").length;

  const detail = data.duels.find((d) => d.id === detailId) ?? null;

  const reset = () => {
    setTitle("");
    setOpponent("");
    setStake("50");
    setDurDays(3);
  };

  const submit = () => {
    if (!title.trim() || !opponent.trim() || !stake) {
      toast.error("Renseignez l'objectif, l'adversaire et l'enjeu.");
      return;
    }
    addDuel({ title: title.trim(), opponent: opponent.trim(), stake: parseFloat(stake), durationDays: durDays });
    toast.success("Duel lancé", { description: `Enjeu de ${stake}$ bloqué. Que le meilleur gagne !` });
    setOpen(false);
    reset();
  };

  const validateWin = (d: Duel) => {
    updateDuel(d.id, { myProgress: 100, status: "gagne" });
    toast.success("Objectif validé ! 🏆", { description: `Vous remportez la cagnotte de ${d.stake * 2}$.` });
    setDetailId(null);
  };

  return (
    <div className="space-y-6 pb-32">
      {/* SCORE DE FIABILITÉ + POT COMMUN */}
      <section className="grid grid-cols-2 gap-3">
        <div
          className="rounded-3xl p-4 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)]"
          style={{ background: "linear-gradient(160deg, oklch(0.72 0.22 140 / 0.14), transparent)" }}
        >
          <ShieldCheck className="h-5 w-5 text-brand-green" />
          <p className="mt-2 text-2xl font-bold text-foreground">{score}%</p>
          <p className="text-[0.68rem] text-muted-foreground">Score de fiabilité</p>
        </div>
        <div
          className="rounded-3xl p-4 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)]"
          style={{ background: "linear-gradient(160deg, oklch(0.8 0.15 90 / 0.14), transparent)" }}
        >
          <Coins className="h-5 w-5 text-brand-gold" />
          <p className="mt-2 text-2xl font-bold text-foreground">{pot}$</p>
          <p className="text-[0.68rem] text-muted-foreground">Pot commun du mois</p>
        </div>
      </section>

      {/* PACTE DE DISCIPLINE */}
      <section
        className="rounded-3xl p-5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)]"
        style={{ background: "linear-gradient(160deg, oklch(0.25 0.03 255), oklch(0.16 0.02 255))" }}
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-brand-gold" />
          <h3 className="text-sm font-bold text-foreground">Le Pacte de Discipline</h3>
        </div>
        <p className="mt-2 text-[0.72rem] leading-relaxed text-muted-foreground">
          Chaque duel reverse <span className="font-semibold text-brand-green">5% de l'enjeu</span> dans le pot
          commun. En fin de mois, les membres au score de fiabilité le plus élevé se partagent la cagnotte.
          Votre régularité paie.
        </p>
      </section>

      {/* CREATE */}
      <Button
        onClick={() => { reset(); setOpen(true); }}
        className="w-full rounded-2xl bg-brand-green py-6 text-background hover:bg-brand-green/90"
      >
        <Plus className="mr-1.5 h-4 w-4" /> Lancer un Duel de Productivité
      </Button>
      <VoiceButton onIntent={onVoiceIntent} label="Micro IA — « Défie un ami sur un objectif »" />

      {/* LIST */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Swords className="h-4 w-4 text-brand-green" /> Mes duels ({activeCount} en cours)
        </h3>
        <div className="space-y-3">
          {data.duels.length === 0 && (
            <p className="rounded-2xl bg-white/[0.03] p-5 text-center text-xs text-muted-foreground">
              Aucun duel. Défiez un ami sur un objectif commun.
            </p>
          )}
          {data.duels.map((d) => {
            const ms = remainingMs(d.startedAt, d.durationDays);
            return (
              <button
                key={d.id}
                onClick={() => setDetailId(d.id)}
                className="w-full rounded-3xl p-4 text-left shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)] transition-transform active:scale-[0.98]"
                style={{ background: "linear-gradient(160deg, oklch(0.22 0.02 255), oklch(0.15 0.015 255))" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{d.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                      <Flame className="h-3 w-3 text-brand-gold" /> vs {d.opponent} · {d.stake}$ en jeu
                    </p>
                  </div>
                  {d.status === "en_cours" ? (
                    <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-green/15 px-2 py-1 text-[0.6rem] font-semibold text-brand-green">
                      <Clock className="h-3 w-3" /> {formatCountdown(ms)}
                    </span>
                  ) : (
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-1 text-[0.6rem] font-semibold ${
                        d.status === "gagne" ? "bg-brand-green/15 text-brand-green" : "bg-brand-red/15 text-brand-red"
                      }`}
                    >
                      {d.status === "gagne" ? "Gagné" : "Perdu"}
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <div className="mb-1 flex justify-between text-[0.62rem] text-muted-foreground">
                      <span>Vous</span>
                      <span>{d.myProgress}%</span>
                    </div>
                    <ProgressBar value={d.myProgress} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-[0.62rem] text-muted-foreground">
                      <span>{d.opponent}</span>
                      <span>{d.oppProgress}%</span>
                    </div>
                    <ProgressBar value={d.oppProgress} tone="muted" />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1 text-[0.65rem] font-medium text-brand-green">
                  Voir le détail <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* CREATE DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-brand-green" /> Nouveau duel
            </DialogTitle>
            <DialogDescription>Défiez un ami. L'enjeu est bloqué jusqu'à la fin du défi.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Objectif commun</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Lancer un business"
                className="mt-1 rounded-xl border-white/10 bg-white/[0.04]"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1 text-xs">
                <UserPlus className="h-3.5 w-3.5" /> Adversaire
              </Label>
              <Input
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Nom / pseudo de l'ami"
                className="mt-1 rounded-xl border-white/10 bg-white/[0.04]"
              />
            </div>
            <div>
              <Label className="text-xs">Enjeu financier ($)</Label>
              <Input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="mt-1 rounded-xl border-white/10 bg-white/[0.04]"
              />
            </div>
            <div>
              <Label className="text-xs">Échéance</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setDurDays(p.days)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      durDays === p.days
                        ? "bg-brand-green text-background"
                        : "bg-white/[0.05] text-muted-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={submit} className="w-full rounded-xl bg-brand-green text-background hover:bg-brand-green/90">
              Bloquer l'enjeu & lancer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CHALLENGE DETAIL */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-brand-green" /> {detail.title}
                </DialogTitle>
                <DialogDescription>
                  Duel contre {detail.opponent} · cagnotte de {detail.stake * 2}$
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* TIMER */}
                <div
                  className="rounded-2xl p-4 text-center shadow-[0_18px_40px_-18px_rgba(0,0,0,0.85)]"
                  style={{ background: "linear-gradient(160deg, oklch(0.72 0.22 140 / 0.12), transparent)" }}
                >
                  <p className="text-[0.62rem] uppercase tracking-widest text-brand-green">
                    {detail.status === "en_cours" ? "Temps restant" : "Défi terminé"}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                    {detail.status === "en_cours"
                      ? formatCountdown(remainingMs(detail.startedAt, detail.durationDays))
                      : detail.status === "gagne"
                      ? "Victoire 🏆"
                      : "Défaite"}
                  </p>
                </div>

                {/* PROGRESSIONS */}
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-foreground">
                      <span className="font-semibold">Ma progression</span>
                      <span>{detail.myProgress}%</span>
                    </div>
                    <ProgressBar value={detail.myProgress} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span className="font-semibold">{detail.opponent}</span>
                      <span>{detail.oppProgress}%</span>
                    </div>
                    <ProgressBar value={detail.oppProgress} tone="muted" />
                  </div>
                </div>

                {detail.status === "en_cours" && (
                  <>
                    <div>
                      <Label className="text-xs">Mettre à jour ma progression</Label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={detail.myProgress}
                        onChange={(e) => updateDuel(detail.id, { myProgress: parseInt(e.target.value, 10) })}
                        className="mt-2 w-full accent-[oklch(0.72_0.22_140)]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => validateWin(detail)}
                        className="rounded-xl bg-brand-green text-background hover:bg-brand-green/90"
                      >
                        <Check className="mr-1 h-4 w-4" /> J'ai gagné
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          updateDuel(detail.id, { status: "perdu" });
                          toast("Duel abandonné", { description: "L'enjeu revient à votre adversaire." });
                          setDetailId(null);
                        }}
                        className="rounded-xl border-white/10 bg-white/[0.04]"
                      >
                        <X className="mr-1 h-4 w-4" /> Abandonner
                      </Button>
                    </div>
                  </>
                )}

                <button
                  onClick={() => {
                    removeDuel(detail.id);
                    toast("Duel supprimé");
                    setDetailId(null);
                  }}
                  className="w-full text-center text-[0.7rem] text-muted-foreground transition-colors hover:text-brand-red"
                >
                  Supprimer ce duel
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
