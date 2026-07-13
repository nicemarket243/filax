import { useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Plus,
  Briefcase,
  Dumbbell,
  Users,
  Bell,
  Trash2,
  AlarmClock,
  X,
  PartyPopper,
  MapPin,
  Coffee,
  User,
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
import { type Program, type ProgramCategory, type DisciplineData } from "./store";
import { useTick } from "@/hooks/use-tick";
import { CommandBar } from "./command-bar";
import { DrawerSection } from "./drawer-section";
import type { ParsedIntent } from "@/hooks/use-voice-command";

interface ProgrammesTabProps {
  data: DisciplineData;
  addProgram: (p: Omit<Program, "id">) => void;
  removeProgram: (id: string) => void;
  onVoiceIntent: (intent: ParsedIntent) => void;
  pendingAiText?: string;
  onConsumeAi?: () => void;
}

const CATEGORIES: {
  value: ProgramCategory;
  icon: typeof Briefcase;
  color: string;
  iconClass: string;
}[] = [
  { value: "Sport", icon: Dumbbell, color: "text-brand-green", iconClass: "bg-brand-green/12 text-brand-green" },
  { value: "Réunion", icon: Users, color: "text-brand-blue", iconClass: "bg-brand-blue/12 text-brand-blue" },
  { value: "Rendez-vous", icon: CalendarClock, color: "text-brand-blue", iconClass: "bg-brand-blue/12 text-brand-blue" },
  { value: "Sortie", icon: MapPin, color: "text-brand-gold", iconClass: "bg-brand-gold/12 text-brand-gold" },
  { value: "Fête", icon: PartyPopper, color: "text-brand-violet", iconClass: "bg-brand-violet/12 text-brand-violet" },
  { value: "Travail", icon: Briefcase, color: "text-brand-gold", iconClass: "bg-brand-gold/12 text-brand-gold" },
  { value: "Personnel", icon: User, color: "text-brand-violet", iconClass: "bg-brand-violet/12 text-brand-violet" },
];

const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Rappels intelligents dégressifs : 6h, 3h, 1h avant, puis l'heure J. */
const SMART_REMINDERS = [360, 180, 60, 0];

/** Parses a natural-language sentence into a program (date + category). */
function aiParse(text: string): { title: string; category: ProgramCategory; at: number } {
  const t = text.toLowerCase();
  let category: ProgramCategory = "Personnel";
  if (/réunion|reunion|meeting/.test(t)) category = "Réunion";
  else if (/rdv|rendez-vous/.test(t)) category = "Rendez-vous";
  else if (/sport|gym|courir|musculation|foot|entraînement|entrainement|séance/.test(t)) category = "Sport";
  else if (/fête|fete|anniversaire|soirée|soiree/.test(t)) category = "Fête";
  else if (/sortie|resto|restaurant|cinéma|cinema|balade/.test(t)) category = "Sortie";
  else if (/travail|boulot|projet|deadline|bureau/.test(t)) category = "Travail";

  const now = new Date();
  const target = new Date(now);

  const dayIdx = DAYS.findIndex((d) => t.includes(d));
  if (t.includes("demain")) {
    target.setDate(now.getDate() + 1);
  } else if (t.includes("après-demain") || t.includes("apres-demain")) {
    target.setDate(now.getDate() + 2);
  } else if (dayIdx >= 0) {
    let diff = (dayIdx - now.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    target.setDate(now.getDate() + diff);
  }

  const timeMatch = t.match(/(\d{1,2})\s*[h:]\s*(\d{2})?/);
  if (timeMatch) {
    target.setHours(parseInt(timeMatch[1], 10), timeMatch[2] ? parseInt(timeMatch[2], 10) : 0, 0, 0);
  } else {
    target.setHours(9, 0, 0, 0);
  }
  if (target.getTime() < now.getTime()) target.setDate(target.getDate() + 1);

  return { title: text.trim().charAt(0).toUpperCase() + text.trim().slice(1), category, at: target.getTime() };
}

export function ProgrammesTab({
  data,
  addProgram,
  removeProgram,
  onVoiceIntent,
  pendingAiText,
  onConsumeAi,
}: ProgrammesTabProps) {
  useTick(1000 * 30);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ProgramCategory>("Sport");
  const [datetime, setDatetime] = useState("");

  // Tunnel mode
  const [tunnel, setTunnel] = useState<Program | null>(null);

  // Une intention IA (texte dicté ailleurs) crée directement le programme.
  useEffect(() => {
    if (!pendingAiText?.trim()) return;
    const parsed = aiParse(pendingAiText);
    addProgram({ ...parsed, reminders: SMART_REMINDERS });
    toast.success("Programme créé", {
      description: `${parsed.category} · ${new Date(parsed.at).toLocaleString("fr-FR", {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    });
    onConsumeAi?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAiText]);

  // Smart Scheduler : planifie les rappels dégressifs via notifications système.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const now = Date.now();
    data.programs.forEach((p) => {
      p.reminders.forEach((min) => {
        const fireAt = p.at - min * 60 * 1000;
        const delay = fireAt - now;
        if (delay <= 0 || delay > 1000 * 60 * 60 * 24) return; // fenêtre 24h
        const id = setTimeout(() => {
          const label = min === 0 ? "C'est l'heure !" : `Dans ${min >= 60 ? `${min / 60}h` : `${min} min`}`;
          if (Notification.permission === "granted") {
            new Notification(`Filax Discipline · ${p.title}`, { body: label });
          }
          toast(`Rappel · ${p.title}`, { description: label });
        }, delay);
        timersRef.current.push(id);
      });
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [data.programs]);

  const createManual = () => {
    if (!title.trim() || !datetime) {
      toast.error("Renseignez un titre et une date/heure.");
      return;
    }
    addProgram({ title: title.trim(), category, at: new Date(datetime).getTime(), reminders: SMART_REMINDERS });
    toast.success("Programme créé", { description: "Rappels intelligents dégressifs activés." });
    setOpen(false);
    setTitle("");
    setDatetime("");
  };

  return (
    <div className="space-y-5 pb-32">
      {/* CARTE COMMANDE IA — compacte : micro + « Dites-moi ce que vous voulez » */}
      <CommandBar onIntent={onVoiceIntent} />

      {/* CRÉATION MANUELLE (+) */}
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.98] hover:bg-white/[0.06]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
          <Plus className="h-4 w-4" />
        </span>
        Créer un programme
      </button>

      {/* TIROIRS PAR CATÉGORIE */}
      <section className="space-y-3">
        {CATEGORIES.map((c) => {
          const items = data.programs
            .filter((p) => p.category === c.value)
            .sort((a, b) => a.at - b.at);
          const Icon = c.icon;
          return (
            <DrawerSection
              key={c.value}
              icon={<Icon className="h-4 w-4" />}
              title={c.value}
              count={items.length}
              iconClass={c.iconClass}
            >
              {items.length === 0 ? (
                <p className="px-1 py-2 text-center text-[0.72rem] text-muted-foreground">
                  Aucun programme dans cette catégorie.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((p) => {
                    const date = new Date(p.at);
                    const soon = p.at - Date.now() < 1000 * 60 * 60 && p.at - Date.now() > 0;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{p.title}</p>
                          <p className="text-[0.7rem] text-muted-foreground">
                            {date.toLocaleString("fr-FR", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-[0.62rem] text-muted-foreground">
                            <Bell className="h-3 w-3" /> {p.reminders.length} rappels
                          </p>
                        </div>
                        {soon && (
                          <button
                            onClick={() => setTunnel(p)}
                            className="rounded-lg border border-brand-red/40 bg-brand-red/10 px-2 py-1 text-[0.6rem] font-semibold text-brand-red"
                          >
                            Tunnel
                          </button>
                        )}
                        <button
                          onClick={() => {
                            removeProgram(p.id);
                            toast("Programme supprimé");
                          }}
                          className="text-muted-foreground hover:text-brand-red"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </DrawerSection>
          );
        })}
      </section>

      {/* MANUAL DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau programme</DialogTitle>
            <DialogDescription>
              Réunion, séance de sport, sortie, fête, rendez-vous…
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[0.72rem] text-muted-foreground">Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Réunion d'équipe" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.72rem] text-muted-foreground">Catégorie</Label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[0.54rem] font-semibold transition-all ${
                        category === c.value
                          ? "border-white/30 bg-white/[0.08] text-foreground"
                          : "border-white/10 bg-white/[0.03] text-muted-foreground"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${c.color}`} /> {c.value}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.72rem] text-muted-foreground">Date et heure</Label>
              <Input type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createManual} className="w-full bg-brand-green text-background hover:bg-brand-green/90">
              Créer le programme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TUNNEL MODE */}
      {tunnel && <TunnelMode program={tunnel} onClose={() => setTunnel(null)} />}
    </div>
  );
}

function TunnelMode({ program, onClose }: { program: Program; onClose: () => void }) {
  const cat = CATEGORIES.find((c) => c.value === program.category) ?? CATEGORIES[0];
  const Icon = cat.icon;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/95 px-8 text-center backdrop-blur-2xl">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.05]">
        <Icon className={`h-10 w-10 ${cat.color}`} />
      </div>
      <span className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-widest text-muted-foreground">
        <AlarmClock className="h-3.5 w-3.5" /> Mode Tunnel actif
      </span>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">{program.title}</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Sonnerie prioritaire · distractions bloquées automatiquement. C'est le moment de vous y consacrer.
      </p>
      <div className="mt-6 rounded-2xl bg-white/[0.04] px-6 py-3 font-mono text-lg font-bold text-foreground">
        {new Date(program.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <button
        onClick={onClose}
        className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-foreground/80 active:scale-95"
      >
        <X className="h-4 w-4" /> J'y suis
      </button>
    </div>
  );
}
