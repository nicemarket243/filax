import { useState } from "react";
import {
  Swords,
  Plus,
  Clock,
  Trophy,
  Flame,
  Coins,
  ShieldCheck,
  Check,
  X,
  UserPlus,
  Share2,
  MessageCircle,
  Send,
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
import { DrawerSection } from "./drawer-section";
import type { ParsedIntent } from "@/hooks/use-voice-command";

interface DuelTabProps {
  data: DisciplineData;
  addDuel: (b: Omit<Duel, "id" | "startedAt" | "myProgress" | "oppProgress" | "status">) => void;
  updateDuel: (id: string, patch: Partial<Duel>) => void;
  removeDuel: (id: string) => void;
  onVoiceIntent: (intent: ParsedIntent) => void;
}

const APP_URL = "https://filax.lovable.app/discipline";
const INVITE_MESSAGE =
  "Salut ! FILAX t'invite à participer à un défi de discipline avec pari. Accepte le défi et tente de gagner de l'argent.";

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
        }}
      />
    </div>
  );
}

function DuelCard({ d, onOpen }: { d: Duel; onOpen: () => void }) {
  const ms = remainingMs(d.startedAt, d.durationDays);
  return (
    <button
      onClick={onOpen}
      className="w-full rounded-2xl bg-white/[0.03] p-4 text-left transition-transform active:scale-[0.98]"
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
    </button>
  );
}

export function DuelTab({ data, addDuel, updateDuel, removeDuel }: DuelTabProps) {
  useTick(1000);
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [opponent, setOpponent] = useState("");
  const [stake, setStake] = useState("50");
  const [durDays, setDurDays] = useState(3);

  const score = reliabilityScore(data.duels);
  const pot = commonPot(data.duels);
  const activeDuels = data.duels.filter((d) => d.status === "en_cours");
  const finishedDuels = data.duels.filter((d) => d.status !== "en_cours");

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

  const shareVia = (channel: "whatsapp" | "messenger" | "sms" | "native") => {
    const text = `${INVITE_MESSAGE} ${APP_URL}`;
    if (channel === "native" && typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({ title: "Défi FILAX", text: INVITE_MESSAGE, url: APP_URL })
        .catch(() => {});
      return;
    }
    let url = "";
    if (channel === "whatsapp") url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    else if (channel === "messenger") url = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(APP_URL)}&app_id=0&redirect_uri=${encodeURIComponent(APP_URL)}`;
    else if (channel === "sms") url = `sms:?&body=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") window.open(url, "_blank");
  };

  return (
    <div className="space-y-5 pb-32">
      {/* SCORE DE FIABILITÉ + POT COMMUN */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white/[0.03] p-4">
          <ShieldCheck className="h-5 w-5 text-brand-green" />
          <p className="mt-2 text-2xl font-bold text-foreground">{score}%</p>
          <p className="text-[0.68rem] text-muted-foreground">Score de fiabilité</p>
        </div>
        <div className="rounded-3xl bg-white/[0.03] p-4">
          <Coins className="h-5 w-5 text-brand-gold" />
          <p className="mt-2 text-2xl font-bold text-foreground">{pot}$</p>
          <p className="text-[0.68rem] text-muted-foreground">Pot commun du mois</p>
        </div>
      </section>

      {/* CREATE */}
      <Button
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="w-full rounded-2xl bg-brand-green py-6 text-background hover:bg-brand-green/90"
      >
        <Plus className="mr-1.5 h-4 w-4" /> Lancer un Duel de Productivité
      </Button>

      {/* DÉFIER UN AMI — bouton "+" pour inviter/partager */}
      <button
        onClick={() => setShare(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
          <Plus className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold text-foreground">Défier un ami sur un objectif</span>
        <Share2 className="ml-auto h-4 w-4 text-muted-foreground" />
      </button>

      {/* TIROIRS DÉFIS */}
      <section className="space-y-3">
        <DrawerSection
          icon={<Swords className="h-4 w-4" />}
          title="Défis en cours"
          count={activeDuels.length}
          defaultOpen
          iconClass="bg-brand-green/12 text-brand-green"
        >
          {activeDuels.length === 0 ? (
            <p className="px-1 py-2 text-center text-[0.72rem] text-muted-foreground">
              Aucun défi en cours. Défiez un ami sur un objectif commun.
            </p>
          ) : (
            <div className="space-y-2">
              {activeDuels.map((d) => (
                <DuelCard key={d.id} d={d} onOpen={() => setDetailId(d.id)} />
              ))}
            </div>
          )}
        </DrawerSection>

        <DrawerSection
          icon={<Trophy className="h-4 w-4" />}
          title="Défis terminés"
          count={finishedDuels.length}
          iconClass="bg-brand-gold/12 text-brand-gold"
        >
          {finishedDuels.length === 0 ? (
            <p className="px-1 py-2 text-center text-[0.72rem] text-muted-foreground">
              Aucun défi terminé pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {finishedDuels.map((d) => (
                <DuelCard key={d.id} d={d} onOpen={() => setDetailId(d.id)} />
              ))}
            </div>
          )}
        </DrawerSection>
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
                      durDays === p.days ? "bg-brand-green text-background" : "bg-white/[0.05] text-muted-foreground"
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

      {/* SHARE / INVITE DIALOG */}
      <Dialog open={share} onOpenChange={setShare}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-brand-green" /> Inviter un ami
            </DialogTitle>
            <DialogDescription>Partagez le défi. Votre ami rejoint FILAX et relève le pari.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-white/[0.03] p-3 text-[0.74rem] italic leading-relaxed text-muted-foreground">
            « {INVITE_MESSAGE} »
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button
              onClick={() => shareVia("whatsapp")}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.04] py-3 text-[0.7rem] font-semibold text-foreground active:scale-95"
            >
              <MessageCircle className="h-5 w-5 text-brand-green" /> WhatsApp
            </button>
            <button
              onClick={() => shareVia("messenger")}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.04] py-3 text-[0.7rem] font-semibold text-foreground active:scale-95"
            >
              <Send className="h-5 w-5 text-brand-blue" /> Messenger
            </button>
            <button
              onClick={() => shareVia("sms")}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/[0.04] py-3 text-[0.7rem] font-semibold text-foreground active:scale-95"
            >
              <MessageCircle className="h-5 w-5 text-brand-gold" /> SMS
            </button>
          </div>
          <Button
            onClick={() => shareVia("native")}
            className="mt-2 w-full rounded-xl bg-brand-green text-background hover:bg-brand-green/90"
          >
            <Share2 className="mr-1.5 h-4 w-4" /> Autre application…
          </Button>
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
                <div className="rounded-2xl bg-white/[0.03] p-4 text-center">
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
