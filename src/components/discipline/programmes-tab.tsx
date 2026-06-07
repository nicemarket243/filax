import { useState } from "react";
import {
  CalendarClock,
  Plus,
  Briefcase,
  Dumbbell,
  GraduationCap,
  Users,
  Bell,
  Trash2,
  Sparkles,
  AlarmClock,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { type Program, type DisciplineData } from "./store";
import { useTick } from "@/hooks/use-tick";
import { VoiceButton } from "./voice-button";
import type { ParsedIntent } from "@/hooks/use-voice-command";

interface ProgrammesTabProps {
  data: DisciplineData;
  addProgram: (p: Omit<Program, "id">) => void;
  removeProgram: (id: string) => void;
  onVoiceIntent: (intent: ParsedIntent) => void;
  pendingAiText?: string;
  onConsumeAi?: () => void;
}

const CATEGORIES: { value: Program["category"]; icon: typeof Briefcase; color: string }[] = [
  { value: "Réunion", icon: Users, color: "text-brand-blue" },
  { value: "Sport", icon: Dumbbell, color: "text-brand-green" },
  { value: "Travail", icon: Briefcase, color: "text-brand-gold" },
  { value: "Études", icon: GraduationCap, color: "text-brand-violet" },
];

const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Parses a natural-language sentence into a program (date + category). */
function aiParse(text: string): { title: string; category: Program["category"]; at: number } {
  const t = text.toLowerCase();
  let category: Program["category"] = "Travail";
  if (/réunion|reunion|rdv|rendez-vous|meeting/.test(t)) category = "Réunion";
  else if (/sport|gym|courir|musculation|foot|entraînement|entrainement/.test(t)) category = "Sport";
  else if (/étude|etude|cours|réviser|reviser|examen|devoir/.test(t)) category = "Études";

  const now = new Date();
  const target = new Date(now);

  // Day of week
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

  // Time hh(h)mm
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
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState(pendingAiText ?? "");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Program["category"]>("Réunion");
  const [datetime, setDatetime] = useState("");

  // Tunnel mode
  const [tunnel, setTunnel] = useState<Program | null>(null);

  const createManual = () => {
    if (!title.trim() || !datetime) {
      toast.error("Renseignez un titre et une date/heure.");
      return;
    }
    addProgram({ title: title.trim(), category, at: new Date(datetime).getTime(), reminders: [30, 10] });
    toast.success("Programme créé", { description: "Rappels automatiques activés." });
    setOpen(false);
    setTitle("");
    setDatetime("");
  };

  const createAi = () => {
    if (!aiText.trim()) {
      toast.error("Décrivez votre événement.");
      return;
    }
    const parsed = aiParse(aiText);
    addProgram({ ...parsed, reminders: [60, 30, 10] });
    toast.success("Événement créé par l'IA", {
      description: `${parsed.category} · ${new Date(parsed.at).toLocaleString("fr-FR", {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      })} · rappels ajoutés`,
    });
    setAiOpen(false);
    setAiText("");
    onConsumeAi?.();
  };

  return (
    <div className="space-y-6 pb-32">
      {/* AI CREATION */}
      <section className="rounded-3xl border border-brand-violet/30 bg-gradient-to-b from-brand-violet/[0.1] to-transparent p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-violet" />
          <h3 className="text-sm font-bold text-foreground">Création par IA</h3>
        </div>
        <p className="mt-1 text-[0.72rem] text-muted-foreground">
          Décrivez votre événement, l'IA crée le programme et les rappels.
        </p>
        <Button
          onClick={() => { setAiText(pendingAiText ?? ""); setAiOpen(true); }}
          className="mt-3 w-full bg-brand-violet text-foreground hover:bg-brand-violet/90"
        >
          <Sparkles className="mr-1.5 h-4 w-4" /> Créer avec l'IA
        </Button>
        <VoiceButton onIntent={onVoiceIntent} className="mt-2" label="Micro IA — « Réunion mercredi à 16h »" />
      </section>

      <Button onClick={() => setOpen(true)} variant="outline" className="w-full border-white/10 bg-white/[0.04]">
        <Plus className="mr-1.5 h-4 w-4" /> Ajouter manuellement
      </Button>

      {/* LIST */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <CalendarClock className="h-4 w-4 text-brand-blue" /> Mes programmes
        </h3>
        <div className="space-y-3">
          {data.programs.map((p) => {
            const cat = CATEGORIES.find((c) => c.value === p.category)!;
            const Icon = cat.icon;
            const date = new Date(p.at);
            const soon = p.at - Date.now() < 1000 * 60 * 60 && p.at - Date.now() > 0;
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-card/60 p-3.5 backdrop-blur-xl">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] ${cat.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{p.title}</p>
                  <p className="text-[0.7rem] text-muted-foreground">
                    {date.toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
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
                    Mode Tunnel
                  </button>
                )}
                <button onClick={() => { removeProgram(p.id); toast("Programme supprimé"); }} className="text-muted-foreground hover:text-brand-red" aria-label="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {data.programs.length === 0 && (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-xs text-muted-foreground">
              Aucun programme. Créez-en un avec l'IA ou manuellement.
            </p>
          )}
        </div>
      </section>

      {/* Demo tunnel trigger */}
      {data.programs.length > 0 && (
        <button
          onClick={() => setTunnel(data.programs[0])}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] py-3 text-xs font-semibold text-muted-foreground"
        >
          <AlarmClock className="h-4 w-4 text-brand-red" /> Aperçu du Mode Tunnel
        </button>
      )}

      {/* MANUAL DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau programme</DialogTitle>
            <DialogDescription>Planifiez un événement avec rappels.</DialogDescription>
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
                      className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[0.58rem] font-semibold transition-all ${
                        category === c.value ? "border-white/30 bg-white/[0.08] text-foreground" : "border-white/10 bg-white/[0.03] text-muted-foreground"
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
            <Button onClick={createManual} className="w-full bg-brand-blue text-foreground hover:bg-brand-blue/90">
              Créer le programme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI DIALOG */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-violet" /> Création par IA
            </DialogTitle>
            <DialogDescription>Écrivez en langage naturel, ex : « J'ai une réunion mercredi à 16h ».</DialogDescription>
          </DialogHeader>
          <Textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            placeholder="J'ai une réunion mercredi à 16h"
            rows={3}
            className="bg-white/[0.04]"
          />
          <DialogFooter>
            <Button onClick={createAi} className="w-full bg-brand-violet text-foreground hover:bg-brand-violet/90">
              <Sparkles className="mr-1.5 h-4 w-4" /> Générer le programme
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
  const cat = CATEGORIES.find((c) => c.value === program.category)!;
  const Icon = cat.icon;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gradient-to-b from-brand-violet/10 via-background to-background px-8 text-center backdrop-blur-2xl">
      <div className="absolute inset-0 animate-pulse-ring opacity-20" />
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand-violet/50 bg-brand-violet/10 shadow-[0_0_60px_-10px_oklch(0.6_0.21_300/0.7)]">
        <Icon className={`h-12 w-12 ${cat.color}`} />
      </div>
      <span className="mt-6 flex items-center gap-2 rounded-full border border-brand-red/40 bg-brand-red/10 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-widest text-brand-red">
        <AlarmClock className="h-3.5 w-3.5 animate-pulse" /> Mode Tunnel actif
      </span>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">{program.title}</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Sonnerie prioritaire · distractions bloquées automatiquement. C'est le moment de vous y consacrer.
      </p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 font-mono text-lg font-bold text-foreground">
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
