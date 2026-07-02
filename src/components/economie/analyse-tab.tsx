import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Flame, TrendingUp, CalendarCheck, Trophy, FileText, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Coffre } from "./coffre";
import { type EconomieData, formatMoney, formatDateTime, METHOD_LABEL } from "./store";

interface AnalyseTabProps {
  data: EconomieData;
}

const GREEN = "oklch(0.72 0.22 140)";
const BLUE = "oklch(0.62 0.19 250)";
const RED = "oklch(0.64 0.22 22)";
const GOLD = "oklch(0.83 0.16 85)";

export function AnalyseTab({ data }: AnalyseTabProps) {
  const totalUsd = data.accounts.filter((a) => a.currency === "USD").reduce((s, a) => s + a.balance, 0);

  // Balance evolution (derived from transactions, USD only, reverse-cumulative)
  const evolution = useMemo(() => {
    const usdTx = data.transactions.filter((t) => t.currency === "USD").slice().sort((a, b) => a.at - b.at);
    const deltas = usdTx.map((t) => (t.type === "depot" ? t.amount : -t.amount));
    const total = deltas.reduce((s, d) => s + d, 0);
    let start = totalUsd - total;
    const pts = [{ name: "Début", solde: Math.round(start) }];
    usdTx.forEach((t, i) => {
      start += deltas[i];
      pts.push({ name: new Date(t.at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), solde: Math.round(start) });
    });
    return pts;
  }, [data.transactions, totalUsd]);

  // Deposits vs withdrawals by month
  const flows = useMemo(() => {
    const map: Record<string, { name: string; depots: number; retraits: number }> = {};
    data.transactions
      .filter((t) => t.currency === "USD")
      .forEach((t) => {
        const k = new Date(t.at).toLocaleDateString("fr-FR", { month: "short" });
        map[k] = map[k] ?? { name: k, depots: 0, retraits: 0 };
        if (t.type === "depot") map[k].depots += t.amount;
        else map[k].retraits += t.amount;
      });
    return Object.values(map);
  }, [data.transactions]);

  // Regroupement de l'historique par mois pour le tiroir « Historique complet ».
  const history = useMemo(() => {
    const map: Record<string, { label: string; ts: number; items: typeof data.transactions }> = {};
    data.transactions
      .slice()
      .sort((a, b) => b.at - a.at)
      .forEach((t) => {
        const d = new Date(t.at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!map[key]) {
          map[key] = {
            label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
            ts: t.at,
            items: [],
          };
        }
        map[key].items.push(t);
      });
    return Object.values(map).sort((a, b) => b.ts - a.ts);
  }, [data.transactions]);



  const proof = () => toast.success("Preuve de fonds générée", { description: "Document PDF officiel prêt." });
  const copyProof = () => {
    navigator.clipboard?.writeText(`FILAX — Solde certifié : ${formatMoney(totalUsd, "USD")}`);
    toast.success("Solde certifié copié");
  };
  const shareProof = () => {
    if (navigator.share) navigator.share({ title: "Preuve de fonds FILAX", text: `Solde certifié : ${formatMoney(totalUsd, "USD")}` });
    else toast.success("Lien copié");
  };

  return (
    <div className="space-y-6">
      {/* SUMMARY */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-brand-blue/15 via-card to-card p-5">
        <p className="text-[0.66rem] uppercase tracking-widest text-muted-foreground">Patrimoine total (USD)</p>
        <p className="mt-1 text-3xl font-extrabold text-foreground">{formatMoney(totalUsd, "USD")}</p>
        <p className="mt-1 flex items-center gap-1 text-[0.72rem] font-semibold text-brand-green">
          <TrendingUp className="h-3.5 w-3.5" /> +12,4 % ce mois
        </p>
      </div>

      {/* BALANCE EVOLUTION */}
      <ChartCard title="Évolution du solde" color="text-brand-green">
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={evolution} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="evo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.5} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "#fff" }}
            />
            <Area type="monotone" dataKey="solde" stroke={GREEN} strokeWidth={2.5} fill="url(#evo)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* FLOWS */}
      <ChartCard title="Dépôts & retraits" color="text-brand-blue">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={flows} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
            />
            <Bar dataKey="depots" name="Dépôts" fill={GREEN} radius={[6, 6, 0, 0]} />
            <Bar dataKey="retraits" name="Retraits" fill={RED} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* DISCIPLINE INDICATORS */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-foreground">Discipline d'épargne</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Indicator icon={CalendarCheck} value="24" label="Jours actifs" color="text-brand-green" />
          <Indicator icon={Flame} value="8" label="Streak actuel" color="text-brand-gold" />
          <Indicator icon={Trophy} value="15" label="Record" color="text-brand-blue" />
          <Indicator icon={TrendingUp} value="6" label="Objectifs en cours" color="text-brand-violet" />
        </div>
      </section>

      {/* PROOF OF FUNDS */}
      <section className="rounded-3xl border border-brand-green/20 bg-gradient-to-br from-brand-green/10 to-transparent p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-green" />
          <h2 className="text-sm font-bold text-foreground">Preuve de fonds officielle</h2>
        </div>
        <p className="mt-2 text-[0.72rem] text-muted-foreground">
          Document PDF certifié avec QR de vérification, identifiant unique et solde attesté.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ProofBtn icon={FileText} label="Télécharger" onClick={proof} primary />
          <ProofBtn icon={Copy} label="Copier" onClick={copyProof} />
          <ProofBtn icon={Share2} label="Partager" onClick={shareProof} />
        </div>
      </section>

      {/* FULL HISTORY */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-foreground">Historique complet</h2>
        <div className="space-y-1.5">
          {data.transactions.map((t) => {
            const acc = data.accounts.find((a) => a.id === t.accountId);
            const dep = t.type === "depot";
            return (
              <div key={t.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] font-semibold text-foreground">
                    {dep ? "Dépôt" : "Retrait"} · {METHOD_LABEL[t.method]}
                  </span>
                  <span className={`text-sm font-bold ${dep ? "text-brand-green" : "text-brand-red"}`}>
                    {dep ? "+" : "−"}
                    {formatMoney(t.amount, t.currency)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[0.64rem] text-muted-foreground">
                  <span>{acc?.name} · {formatDateTime(t.at)}</span>
                  <span className="font-mono text-brand-gold">{t.reference}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ChartCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className={`mb-2 text-sm font-bold ${color}`}>{title}</h3>
      {children}
    </div>
  );
}

function Indicator({ icon: Icon, value, label, color }: { icon: typeof Flame; value: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <Icon className={`h-5 w-5 ${color}`} />
      <p className="mt-2 text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-[0.68rem] text-muted-foreground">{label}</p>
    </div>
  );
}

function ProofBtn({ icon: Icon, label, onClick, primary }: { icon: typeof Copy; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-[0.62rem] font-semibold transition-all active:scale-95 ${
        primary ? "bg-brand-green text-background" : "border border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
