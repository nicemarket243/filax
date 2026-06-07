import { useEffect, useState } from "react";
import {
  Lock,
  Plus,
  Clock,
  Globe,
  Smartphone,
  ShieldAlert,
  Play,
  Pencil,
  Trophy,
  ListPlus,
  X,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AppBlock,
  type DisciplineData,
  DURATION_PRESETS,
  formatCountdown,
  remainingMs,
} from "./store";
import { useTick } from "@/hooks/use-tick";
import { VoiceButton } from "./voice-button";
import type { ParsedIntent } from "@/hooks/use-voice-command";

const SUGGESTED_APPS = ["TikTok", "Instagram", "Facebook", "Snapchat", "YouTube", "Twitter/X"];
const SUGGESTED_SITES = ["reddit.com", "twitch.tv", "netflix.com", "9gag.com", "amazon.com"];

interface BlocagesTabProps {
  data: DisciplineData;
  addBlock: (b: Omit<AppBlock, "id" | "startedAt">) => void;
  updateBlock: (id: string, patch: Partial<AppBlock>) => void;
  removeBlock: (id: string) => void;
  onVoiceIntent: (intent: ParsedIntent) => void;
  activeBetTitle?: string;
}

export function BlocagesTab({
  data,
  addBlock,
  updateBlock,
  removeBlock,
  onVoiceIntent,
  activeBetTitle,
}: BlocagesTabProps) {
  useTick(1000);
  const [dialogKind, setDialogKind] = useState<"app" | "site" | null>(null);
  const [name, setName] = useState("");
  const [durDays, setDurDays] = useState(30);
  const [customH, setCustomH] = useState("");

  // Focus session
  const [focusEnd, setFocusEnd] = useState<number | null>(null);
  const [focusDialog, setFocusDialog] = useState(false);
  const [focusMin, setFocusMin] = useState(45);

  // Hard lock overlay
  const [hardLock, setHardLock] = useState<AppBlock | null>(null);

  const openAdd = (kind: "app" | "site") => {
    setDialogKind(kind);
    setName("");
    setDurDays(30);
    setCustomH("");
  };

  const confirmAdd = () => {
    if (!name.trim()) {
      toast.error("Indiquez un nom.");
      return;
    }
    const days = customH ? Math.max(0.01, parseFloat(customH) / 24) : durDays;
    addBlock({ name: name.trim(), kind: dialogKind!, durationDays: days });
    toast.success(`${name.trim()} bloqué`, { description: "Le blocage est désormais actif." });
    setDialogKind(null);
  };

  const focusRemaining = focusEnd ? Math.max(0, focusEnd - Date.now()) : 0;
  const focusActive = focusEnd !== null && focusRemaining > 0;

  useEffect(() => {
    if (focusEnd !== null && focusRemaining <= 0) {
      setFocusEnd(null);
      toast.success("Focus terminé. Bravo 👏");
    }
  }, [focusEnd, focusRemaining]);

  return (
    <div className="space-y-6 pb-32">
      {/* FOCUS ZONE */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-brand-green/[0.08] to-transparent p-6">
        <div className="flex flex-col items-center">
          <div className="relative flex h-52 w-52 items-center justify-center">
            <div className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-brand-green/30" />
            <div className="absolute inset-3 rounded-full border border-brand-blue/20" />
            <div className="absolute inset-0 rounded-full bg-brand-green/5 shadow-[0_0_60px_-10px_oklch(0.72_0.22_140/0.6)]" />
            <div className="flex flex-col items-center">
              <span className="text-[0.62rem] font-semibold uppercase tracking-widest text-brand-green">
                {focusActive ? "Focus en cours" : "Zone Focus"}
              </span>
              <span className="mt-1 font-mono text-3xl font-bold text-foreground">
                {focusActive ? formatCountdown(focusRemaining) : "00:00:00"}
              </span>
              <span className="mt-1 text-[0.62rem] text-muted-foreground">
                {focusActive ? "Restez concentré" : "Lancez une session"}
              </span>
            </div>
          </div>

          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            <Button
              onClick={() => (focusActive ? setFocusEnd(null) : setFocusDialog(true))}
              className="bg-brand-green text-background hover:bg-brand-green/90"
            >
              <Play className="mr-1.5 h-4 w-4" /> {focusActive ? "Arrêter" : "Lancer un Focus"}
            </Button>
            <Button
              variant="outline"
              onClick={() => toast("Nouvelle tâche", { description: "Ajoutez une tâche à votre session de focus." })}
              className="border-white/10 bg-white/[0.04]"
            >
              <ListPlus className="mr-1.5 h-4 w-4" /> Ajouter une tâche
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast(activeBetTitle ? "Pari actif" : "Aucun pari", {
                  description: activeBetTitle ?? "Créez un pari dans l'onglet Paris.",
                })
              }
              className="border-white/10 bg-white/[0.04]"
            >
              <Trophy className="mr-1.5 h-4 w-4 text-brand-gold" /> Voir mon Pari
            </Button>
            <Button
              variant="outline"
              onClick={() => setFocusDialog(true)}
              className="border-white/10 bg-white/[0.04]"
            >
              <Pencil className="mr-1.5 h-4 w-4" /> Modifier
            </Button>
          </div>

          <VoiceButton onIntent={onVoiceIntent} className="mt-3 w-full" label="Micro IA — commande vocale" />
        </div>
      </section>

      {/* ADD ACTIONS */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => openAdd("app")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-brand-green/30 bg-brand-green/10 py-3 text-sm font-semibold text-foreground transition-all active:scale-95"
        >
          <Smartphone className="h-4 w-4 text-brand-green" /> Bloquer une app
        </button>
        <button
          onClick={() => openAdd("site")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-brand-blue/30 bg-brand-blue/10 py-3 text-sm font-semibold text-foreground transition-all active:scale-95"
        >
          <Globe className="h-4 w-4 text-brand-blue" /> Bloquer un site
        </button>
      </div>

      {/* ACTIVE BLOCKS */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Lock className="h-4 w-4 text-brand-green" /> Blocages actifs ({data.blocks.length})
        </h3>
        <div className="space-y-3">
          {data.blocks.length === 0 && (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-xs text-muted-foreground">
              Aucun blocage actif. Ajoutez une app ou un site ci-dessus.
            </p>
          )}
          {data.blocks.map((b) => {
            const ms = remainingMs(b.startedAt, b.durationDays);
            const expired = ms <= 0;
            return (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-card/60 p-3.5 backdrop-blur-xl"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    b.kind === "app" ? "bg-brand-green/15 text-brand-green" : "bg-brand-blue/15 text-brand-blue"
                  }`}
                >
                  {b.kind === "app" ? <Smartphone className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
                </span>
                <button onClick={() => !expired && setHardLock(b)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                  <p className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {expired ? (
                      <span className="text-brand-gold">Terminé</span>
                    ) : (
                      formatCountdown(ms)
                    )}
                  </p>
                </button>
                <button
                  onClick={() => {
                    updateBlock(b.id, { durationDays: b.durationDays + 1 });
                    toast.success("Blocage prolongé de 24h");
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[0.65rem] font-semibold text-foreground/80 active:scale-90"
                >
                  +24h
                </button>
                <button
                  onClick={() => {
                    removeBlock(b.id);
                    toast("Blocage retiré");
                  }}
                  className="text-muted-foreground transition-colors hover:text-brand-red"
                  aria-label="Retirer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ADD DIALOG */}
      <Dialog open={dialogKind !== null} onOpenChange={(o) => !o && setDialogKind(null)}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogKind === "app" ? (
                <Smartphone className="h-5 w-5 text-brand-green" />
              ) : (
                <Globe className="h-5 w-5 text-brand-blue" />
              )}
              {dialogKind === "app" ? "Bloquer une application" : "Bloquer un site"}
            </DialogTitle>
            <DialogDescription>Voulez-vous confirmer ce blocage ?</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[0.72rem] text-muted-foreground">
                {dialogKind === "app" ? "Nom de l'application" : "URL du site"}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={dialogKind === "app" ? "TikTok" : "exemple.com"}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(dialogKind === "app" ? SUGGESTED_APPS : SUGGESTED_SITES).map((s) => (
                  <button
                    key={s}
                    onClick={() => setName(s)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.65rem] text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.72rem] text-muted-foreground">Durée du blocage</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setDurDays(p.days);
                      setCustomH("");
                    }}
                    className={`rounded-lg border px-1 py-1.5 text-[0.6rem] font-semibold transition-all ${
                      !customH && durDays === p.days
                        ? "border-brand-green/50 bg-brand-green/10 text-foreground"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                placeholder="Durée personnalisée (heures)"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialogKind(null)} className="flex-1 border-white/10 bg-white/[0.04]">
              Annuler
            </Button>
            <Button onClick={confirmAdd} className="flex-1 bg-brand-green text-background hover:bg-brand-green/90">
              Confirmer le blocage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FOCUS DIALOG */}
      <Dialog open={focusDialog} onOpenChange={setFocusDialog}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle>Lancer une session de Focus</DialogTitle>
            <DialogDescription>Choisissez la durée de concentration.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {[15, 25, 45, 60, 90, 120].map((m) => (
              <button
                key={m}
                onClick={() => setFocusMin(m)}
                className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                  focusMin === m
                    ? "border-brand-green/50 bg-brand-green/10 text-foreground"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground"
                }`}
              >
                {m}min
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setFocusEnd(Date.now() + focusMin * 60 * 1000);
                setFocusDialog(false);
                toast.success(`Focus lancé — ${focusMin} minutes`);
              }}
              className="w-full bg-brand-green text-background hover:bg-brand-green/90"
            >
              <Play className="mr-1.5 h-4 w-4" /> Démarrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HARD LOCK OVERLAY */}
      {hardLock && (
        <HardLockOverlay block={hardLock} onClose={() => setHardLock(null)} />
      )}
    </div>
  );
}

function HardLockOverlay({ block, onClose }: { block: AppBlock; onClose: () => void }) {
  useTick(1000);
  const ms = remainingMs(block.startedAt, block.durationDays);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/95 px-8 text-center backdrop-blur-2xl">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand-red/50 bg-brand-red/10 shadow-[0_0_60px_-10px_oklch(0.64_0.22_22/0.7)]">
        <ShieldAlert className="h-12 w-12 text-brand-red" />
      </div>
      <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-brand-red">ZONE DE DISCIPLINE</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{block.name}</span> est bloqué. Impossible de
        contourner ce blocage pendant la durée engagée.
      </p>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-5">
        <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-muted-foreground">
          Temps restant
        </p>
        <p className="mt-1 font-mono text-4xl font-bold text-foreground">{formatCountdown(ms)}</p>
      </div>
      <button
        onClick={onClose}
        className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-foreground/80 active:scale-95"
      >
        <X className="h-4 w-4" /> Rester discipliné
      </button>
    </div>
  );
}
