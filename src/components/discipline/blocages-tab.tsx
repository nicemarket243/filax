import { useEffect, useState } from "react";
import {
  Lock,
  Clock,
  Globe,
  Smartphone,
  ShieldAlert,
  Play,
  Square,
  Trash2,
  History,
  CalendarCheck,
  Plus,
  Timer,
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
import { CommandBar } from "./command-bar";
import { DrawerSection } from "./drawer-section";
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

/** Minuteur premium minimaliste : anneau fin, sans halo ni effet lumineux. */
function FocusRing({ progress, label, time, sub }: { progress: number; label: string; time: string; sub: string }) {
  const R = 84;
  const C = 2 * Math.PI * R;
  const dash = C * Math.min(1, Math.max(0, progress));
  return (
    <div className="relative flex h-52 w-52 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={R} fill="none" stroke="oklch(1 0 0 / 0.07)" strokeWidth="4" />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="var(--brand-green)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <span className="mt-1.5 font-mono text-3xl font-semibold tracking-tight text-foreground tabular-nums">
          {time}
        </span>
        <span className="mt-1 text-[0.62rem] text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}

export function BlocagesTab({ data, addBlock, updateBlock, removeBlock, onVoiceIntent }: BlocagesTabProps) {
  useTick(1000);
  const [dialogKind, setDialogKind] = useState<"app" | "site" | null>(null);
  const [name, setName] = useState("");
  const [durDays, setDurDays] = useState(30);
  const [customH, setCustomH] = useState("");

  // Focus session
  const [focusStart, setFocusStart] = useState<number | null>(null);
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
  const focusTotal = focusStart && focusEnd ? focusEnd - focusStart : 1;
  const focusProgress = focusActive ? 1 - focusRemaining / focusTotal : 0;

  useEffect(() => {
    if (focusEnd !== null && focusRemaining <= 0) {
      setFocusEnd(null);
      setFocusStart(null);
      toast.success("Focus terminé. Bravo 👏");
    }
  }, [focusEnd, focusRemaining]);

  return (
    <div className="space-y-5 pb-32">
      {/* MINUTEUR PREMIUM MINIMALISTE */}
      <section className="rounded-3xl bg-white/[0.03] p-6">
        <div className="flex flex-col items-center">
          <FocusRing
            progress={focusProgress}
            label={focusActive ? "Focus en cours" : "Zone Focus"}
            time={focusActive ? formatCountdown(focusRemaining) : "00:00:00"}
            sub={focusActive ? "Restez concentré" : "Lancez une session"}
          />
          <Button
            onClick={() => {
              if (focusActive) {
                setFocusEnd(null);
                setFocusStart(null);
              } else {
                setFocusDialog(true);
              }
            }}
            className="mt-5 w-full rounded-2xl bg-brand-green py-5 text-background hover:bg-brand-green/90"
          >
            {focusActive ? (
              <>
                <Square className="mr-1.5 h-4 w-4" /> Arrêter la session
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-4 w-4" /> Lancer un Focus
              </>
            )}
          </Button>
        </div>
      </section>

      {/* CARTE COMMANDE IA — compacte : micro + « Dites-moi ce que vous voulez » */}
      <CommandBar onIntent={onVoiceIntent} />

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

      {/* BLOCAGES ACTIFS — chaque app possède son propre tiroir/dashboard */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 px-1 text-sm font-bold text-foreground">
          <Lock className="h-4 w-4 text-brand-green" /> Blocages actifs ({data.blocks.length})
        </h3>
        {data.blocks.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-xs text-muted-foreground">
            Aucun blocage actif. Ajoutez une app ou un site ci-dessus.
          </p>
        )}
        {data.blocks.map((b) => {
          const ms = remainingMs(b.startedAt, b.durationDays);
          const expired = ms <= 0;
          return (
            <DrawerSection
              key={b.id}
              icon={b.kind === "app" ? <Smartphone className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              title={b.name}
              meta={expired ? "Terminé" : formatCountdown(ms)}
              iconClass={
                b.kind === "app" ? "bg-brand-green/12 text-brand-green" : "bg-brand-blue/12 text-brand-blue"
              }
            >
              <AppDashboard
                block={b}
                onExtend={() => {
                  updateBlock(b.id, { durationDays: b.durationDays + 1 });
                  toast.success("Blocage prolongé de 24h");
                }}
                onHardLock={() => !expired && setHardLock(b)}
                onRemove={() => {
                  removeBlock(b.id);
                  toast("Blocage levé");
                }}
              />
            </DrawerSection>
          );
        })}
      </section>

      {/* HISTORIQUE — rangé dans un tiroir */}
      <DrawerSection
        icon={<History className="h-4 w-4" />}
        title="Historique des blocages"
        count={data.history.length}
        iconClass="bg-white/[0.06] text-muted-foreground"
      >
        {data.history.length === 0 ? (
          <p className="px-1 py-2 text-center text-[0.72rem] text-muted-foreground">
            Aucun blocage terminé pour le moment.
          </p>
        ) : (
          <div className="space-y-2">
            {data.history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground">
                  {h.kind === "app" ? <Smartphone className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{h.name}</p>
                  <p className="text-[0.68rem] text-muted-foreground">
                    {new Date(h.endedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}
                    {h.reason === "completed" ? "Terminé" : "Levé"}
                  </p>
                </div>
                <span className="text-[0.66rem] text-muted-foreground">
                  {h.durationDays >= 1 ? `${Math.round(h.durationDays)}j` : `${Math.round(h.durationDays * 24)}h`}
                </span>
              </div>
            ))}
          </div>
        )}
      </DrawerSection>

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
                setFocusStart(Date.now());
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
      {hardLock && <HardLockOverlay block={hardLock} onClose={() => setHardLock(null)} />}
    </div>
  );
}

/** Dashboard dédié d'une application bloquée. */
function AppDashboard({
  block,
  onExtend,
  onHardLock,
  onRemove,
}: {
  block: AppBlock;
  onExtend: () => void;
  onHardLock: () => void;
  onRemove: () => void;
}) {
  useTick(1000);
  const ms = remainingMs(block.startedAt, block.durationDays);
  const expired = ms <= 0;
  const total = block.durationDays * 24 * 60 * 60 * 1000;
  const done = Math.min(100, Math.round(((total - ms) / total) * 100));
  const endDate = new Date(block.startedAt + total);

  return (
    <div className="space-y-3">
      {/* Temps restant */}
      <div className="rounded-xl bg-white/[0.03] p-3.5 text-center">
        <p className="text-[0.58rem] font-medium uppercase tracking-widest text-muted-foreground">
          {expired ? "Blocage terminé" : "Temps restant"}
        </p>
        <p className="mt-1 font-mono text-2xl font-semibold text-foreground tabular-nums">
          {expired ? "00:00:00" : formatCountdown(ms)}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${done}%` }} />
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/[0.03] p-3">
          <CalendarCheck className="h-4 w-4 text-brand-green" />
          <p className="mt-1.5 text-[0.6rem] text-muted-foreground">Fin du blocage</p>
          <p className="text-[0.74rem] font-semibold text-foreground">
            {endDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3">
          <Timer className="h-4 w-4 text-brand-blue" />
          <p className="mt-1.5 text-[0.6rem] text-muted-foreground">Durée totale</p>
          <p className="text-[0.74rem] font-semibold text-foreground">
            {block.durationDays >= 1
              ? `${Math.round(block.durationDays)} jour${block.durationDays >= 2 ? "s" : ""}`
              : `${Math.round(block.durationDays * 24)} h`}
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3">
          <Clock className="h-4 w-4 text-brand-gold" />
          <p className="mt-1.5 text-[0.6rem] text-muted-foreground">Progression</p>
          <p className="text-[0.74rem] font-semibold text-foreground">{done}%</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3">
          <CalendarCheck className="h-4 w-4 text-brand-violet" />
          <p className="mt-1.5 text-[0.6rem] text-muted-foreground">Démarré le</p>
          <p className="text-[0.74rem] font-semibold text-foreground">
            {new Date(block.startedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExtend}
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-[0.72rem] font-semibold text-foreground/90 active:scale-95"
        >
          <Plus className="mr-1 inline h-3.5 w-3.5" /> Prolonger 24h
        </button>
        {!expired && (
          <button
            onClick={onHardLock}
            className="flex-1 rounded-xl border border-brand-red/30 bg-brand-red/10 py-2 text-[0.72rem] font-semibold text-brand-red active:scale-95"
          >
            <ShieldAlert className="mr-1 inline h-3.5 w-3.5" /> Zone de discipline
          </button>
        )}
        <button
          onClick={onRemove}
          className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-muted-foreground hover:text-brand-red active:scale-95"
          aria-label="Lever le blocage"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function HardLockOverlay({ block, onClose }: { block: AppBlock; onClose: () => void }) {
  useTick(1000);
  const ms = remainingMs(block.startedAt, block.durationDays);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/95 px-8 text-center backdrop-blur-2xl">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-red/10">
        <ShieldAlert className="h-10 w-10 text-brand-red" />
      </div>
      <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-brand-red">ZONE DE DISCIPLINE</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{block.name}</span> est bloqué. Impossible de contourner ce
        blocage pendant la durée engagée.
      </p>
      <div className="mt-8 rounded-2xl bg-white/[0.04] px-8 py-5">
        <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-muted-foreground">Temps restant</p>
        <p className="mt-1 font-mono text-4xl font-semibold text-foreground tabular-nums">{formatCountdown(ms)}</p>
      </div>
      <button
        onClick={onClose}
        className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-foreground/80 active:scale-95"
      >
        Rester discipliné
      </button>
    </div>
  );
}
