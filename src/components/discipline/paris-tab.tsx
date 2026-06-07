import { useState } from "react";
import {
  Trophy,
  Plus,
  TrendingUp,
  Clock,
  Flame,
  AlertTriangle,
  Pencil,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
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
import { type Bet, type DisciplineData, DURATION_PRESETS, formatCountdown, remainingMs } from "./store";
import { useTick } from "@/hooks/use-tick";
import { VoiceButton } from "./voice-button";
import type { ParsedIntent } from "@/hooks/use-voice-command";

interface ParisTabProps {
  data: DisciplineData;
  addBet: (b: Omit<Bet, "id" | "startedAt">) => void;
  updateBet: (id: string, patch: Partial<Bet>) => void;
  onVoiceIntent: (intent: ParsedIntent) => void;
}

const RISKS: Bet["risk"][] = ["Faible", "Moyen", "Élevé"];
const riskColor: Record<Bet["risk"], string> = {
  Faible: "text-brand-green",
  Moyen: "text-brand-gold",
  Élevé: "text-brand-red",
};

export function ParisTab({ data, addBet, updateBet, onVoiceIntent }: ParisTabProps) {
  useTick(1000);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("20");
  const [durDays, setDurDays] = useState(30);
  const [risk, setRisk] = useState<Bet["risk"]>("Moyen");

  const totalEngaged = data.bets.reduce((s, b) => s + b.amount, 0);

  const chartData = data.bets.length
    ? data.bets
        .slice()
        .reverse()
        .map((b, i) => ({ name: `#${i + 1}`, montant: b.amount }))
    : [{ name: "—", montant: 0 }];

  const reset = () => {
    setEditId(null);
    setTitle("");
    setAmount("20");
    setDurDays(30);
    setRisk("Moyen");
  };

  const submit = () => {
    if (!title.trim() || !amount) {
      toast.error("Renseignez un objectif et un montant.");
      return;
    }
    if (editId) {
      updateBet(editId, { title: title.trim(), amount: parseFloat(amount), risk });
      toast.success("Pari mis à jour");
    } else {
      addBet({ title: title.trim(), amount: parseFloat(amount), durationDays: durDays, risk });
      toast.success("Pari créé", { description: "Engagement enregistré. Impossible d'annuler un pari actif." });
    }
    setOpen(false);
    reset();
  };

  return (
    <div className="space-y-6 pb-32">
      {/* SUMMARY */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-brand-gold/30 bg-gradient-to-b from-brand-gold/[0.1] to-transparent p-4">
          <CircleDollarSign className="h-5 w-5 text-brand-gold" />
          <p className="mt-2 text-2xl font-bold text-foreground">{totalEngaged}$</p>
          <p className="text-[0.68rem] text-muted-foreground">Montant engagé total</p>
        </div>
        <div className="rounded-2xl border border-brand-green/30 bg-gradient-to-b from-brand-green/[0.1] to-transparent p-4">
          <Trophy className="h-5 w-5 text-brand-green" />
          <p className="mt-2 text-2xl font-bold text-foreground">{data.bets.length}</p>
          <p className="text-[0.68rem] text-muted-foreground">Paris en cours</p>
        </div>
      </section>

      {/* CHART */}
      <section className="rounded-3xl border border-white/10 bg-card/50 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
          <TrendingUp className="h-4 w-4 text-brand-blue" /> Évolution des engagements
        </h3>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="betGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.62 0.19 250)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.62 0.19 250)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.2 0.02 255)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="montant" stroke="oklch(0.62 0.19 250)" strokeWidth={2} fill="url(#betGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <Button onClick={() => { reset(); setOpen(true); }} className="w-full bg-brand-gold text-background hover:bg-brand-gold/90">
        <Plus className="mr-1.5 h-4 w-4" /> Créer un pari
      </Button>
      <VoiceButton onIntent={onVoiceIntent} label="Micro IA — « Crée un pari de 20 dollars »" />

      {/* LIST */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Flame className="h-4 w-4 text-brand-red" /> Mes paris actifs
        </h3>
        <div className="space-y-3">
          {data.bets.map((b) => {
            const ms = remainingMs(b.startedAt, b.durationDays);
            return (
              <div key={b.id} className="rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{b.title}</p>
                  <button
                    onClick={() => {
                      setEditId(b.id);
                      setTitle(b.title);
                      setAmount(String(b.amount));
                      setRisk(b.risk);
                      setOpen(true);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/[0.04] p-2">
                    <p className="text-sm font-bold text-brand-gold">{b.amount}$</p>
                    <p className="text-[0.6rem] text-muted-foreground">Engagé</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] p-2">
                    <p className="text-[0.72rem] font-bold text-foreground">{formatCountdown(ms)}</p>
                    <p className="text-[0.6rem] text-muted-foreground">Restant</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] p-2">
                    <p className={`text-sm font-bold ${riskColor[b.risk]}`}>{b.risk}</p>
                    <p className="text-[0.6rem] text-muted-foreground">Risque</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[0.68rem] text-brand-red">
                    <AlertTriangle className="h-3.5 w-3.5" /> Coût de l'échec : {b.amount}$
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      updateBet(b.id, { durationDays: b.durationDays + 1 });
                      toast.success("+24h ajoutées au pari");
                    }}
                    className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[0.68rem] font-semibold"
                  >
                    <Clock className="h-3.5 w-3.5" /> +24h
                  </button>
                  <button
                    onClick={() => {
                      updateBet(b.id, { amount: b.amount + 5 });
                      toast.success("+5$ ajoutés à l'enjeu");
                    }}
                    className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[0.68rem] font-semibold"
                  >
                    <CircleDollarSign className="h-3.5 w-3.5" /> +5$
                  </button>
                </div>
              </div>
            );
          })}
          {data.bets.length === 0 && (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-xs text-muted-foreground">
              Aucun pari en cours. Engagez-vous en créant un pari.
            </p>
          )}
        </div>
      </section>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-sm rounded-3xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand-gold" /> {editId ? "Modifier le pari" : "Créer un pari"}
            </DialogTitle>
            <DialogDescription>
              {editId ? "Vous pouvez augmenter l'enjeu, jamais annuler un pari actif." : "Engagez-vous financièrement sur un objectif."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[0.72rem] text-muted-foreground">Objectif</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : 30 jours sans TikTok" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.72rem] text-muted-foreground">Montant engagé (USD)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            {!editId && (
              <div className="space-y-1.5">
                <Label className="text-[0.72rem] text-muted-foreground">Durée</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {DURATION_PRESETS.slice(3).map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setDurDays(p.days)}
                      className={`rounded-lg border px-1 py-1.5 text-[0.6rem] font-semibold transition-all ${
                        durDays === p.days
                          ? "border-brand-gold/50 bg-brand-gold/10 text-foreground"
                          : "border-white/10 bg-white/[0.03] text-muted-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[0.72rem] text-muted-foreground">Niveau de risque</Label>
              <div className="grid grid-cols-3 gap-2">
                {RISKS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    className={`rounded-lg border py-2 text-xs font-semibold transition-all ${
                      risk === r ? `border-white/30 bg-white/[0.08] ${riskColor[r]}` : "border-white/10 bg-white/[0.03] text-muted-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} className="w-full bg-brand-gold text-background hover:bg-brand-gold/90">
              {editId ? "Enregistrer" : "Confirmer le pari"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
