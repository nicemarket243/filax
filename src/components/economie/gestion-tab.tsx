import { useMemo, useState } from "react";
import {
  Plus,
  Users,
  QrCode,
  Copy,
  Check,
  Trophy,
  Clock,
  ChevronDown,
  ThumbsUp,
  TrendingUp,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCode } from "./qr-code";
import { Coffre } from "./coffre";
import {
  type EconomieData,
  type Group,
  type GroupMember,
  formatMoney,
  formatDate,
} from "./store";

interface GestionTabProps {
  data: EconomieData;
  onCreateGoal: () => void;
  onCreateGroup: () => void;
  onFundGoal: (id: string, amount: number) => void;
  onToggleMember: (groupId: string, memberId: string) => void;
  onAddMember: (groupId: string, name: string, amount: number) => void;
  onRecordContribution: (groupId: string, memberId: string, amount: number) => void;
  onToggleLike: (groupId: string, memberId: string) => void;
}

export function GestionTab({
  data,
  onCreateGoal,
  onCreateGroup,
  onFundGoal,
  onToggleMember,
  onAddMember,
  onRecordContribution,
  onToggleLike,
}: GestionTabProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const daysLeft = (ts: number) => Math.max(0, Math.round((ts - Date.now()) / 86_400_000));
  const activeGroup = data.groups.find((g) => g.id === openGroup) ?? null;

  return (
    <div className="space-y-6">
      {/* GOALS — tiroir unique */}
      <Coffre title="Objectifs financiers" count={data.goals.length}>
        <div className="space-y-2.5">
          <button
            onClick={onCreateGoal}
            className="magnetide-tap flex w-full items-center justify-center gap-1 rounded-xl bg-brand-blue/15 py-2.5 text-[0.72rem] font-bold text-brand-blue"
          >
            <Plus className="h-3.5 w-3.5" /> Créer un objectif
          </button>
          {data.goals.map((g) => {
            const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
            const done = pct >= 100;
            return (
              <div key={g.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span style={{ background: `color-mix(in oklch, var(--${g.color}) 15%, transparent)` }} className="flex h-11 w-11 items-center justify-center rounded-xl text-xl">{g.icon}</span>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        {g.name}
                        {done && <Trophy className="h-3.5 w-3.5 text-brand-gold" />}
                      </p>
                      <p className="flex items-center gap-1 text-[0.66rem] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {daysLeft(g.deadline)} j restants · {formatDate(g.deadline)}
                      </p>
                    </div>
                  </div>
                  <span style={{ color: `var(--${g.color})` }} className="text-sm font-bold">{pct}%</span>
                </div>
                {g.description && <p className="mt-2 text-[0.7rem] text-muted-foreground">{g.description}</p>}
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full bg-${g.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[0.72rem] text-muted-foreground">
                    {formatMoney(g.saved, "USD")} / {formatMoney(g.target, "USD")}
                  </span>
                  {done ? (
                    <button
                      onClick={() => toast.success(`🎉 Succès « ${g.name} » — image premium générée`)}
                      className="rounded-full bg-brand-gold/15 px-3 py-1 text-[0.66rem] font-bold text-brand-gold"
                    >
                      Partager le succès
                    </button>
                  ) : (
                    <button
                      onClick={() => onFundGoal(g.id, 50)}
                      className="magnetide-tap rounded-full bg-brand-green/15 px-3 py-1 text-[0.66rem] font-bold text-brand-green"
                    >
                      + 50 USD
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Coffre>

      {/* GROUPS — tiroir unique */}
      <Coffre title="Groupes d'épargne" count={data.groups.length}>
        <div className="space-y-2.5">
          <button
            onClick={onCreateGroup}
            className="magnetide-tap flex w-full items-center justify-center gap-1 rounded-xl bg-brand-violet/15 py-2.5 text-[0.72rem] font-bold text-brand-violet"
          >
            <Plus className="h-3.5 w-3.5" /> Créer un groupe
          </button>
          {data.groups.map((grp) => {
            const total = grp.members.filter((m) => m.paid).reduce((s, m) => s + m.amount, 0);
            const pct = grp.target > 0 ? Math.min(100, Math.round((total / grp.target) * 100)) : 0;
            return (
              <button
                key={grp.id}
                onClick={() => setOpenGroup(grp.id)}
                className="w-full rounded-2xl border border-brand-violet/20 bg-white/[0.03] p-4 text-left transition-all hover:bg-white/[0.06] active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-violet/15 text-2xl">{grp.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{grp.name}</p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      {grp.members.length} membres · {formatMoney(total, "USD")} collectés
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
                </div>
                {grp.target > 0 && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-brand-violet transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Coffre>


      <GroupDetailDialog
        group={activeGroup}
        onClose={() => setOpenGroup(null)}
        onAddMember={onAddMember}
        onRecordContribution={onRecordContribution}
        onToggleLike={onToggleLike}
      />
    </div>
  );
}

/* ============================================================= */
/* Group detail — design épuré noir / blanc / violet             */
/* ============================================================= */

function GroupDetailDialog({
  group,
  onClose,
  onAddMember,
  onRecordContribution,
  onToggleLike,
}: {
  group: Group | null;
  onClose: () => void;
  onAddMember: (groupId: string, name: string, amount: number) => void;
  onRecordContribution: (groupId: string, memberId: string, amount: number) => void;
  onToggleLike: (groupId: string, memberId: string) => void;
}) {
  const [invite, setInvite] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [memberName, setMemberName] = useState("");

  // Tri dynamique : le membre avec l'activité la plus récente remonte en tête.
  const sorted = useMemo<GroupMember[]>(() => {
    if (!group) return [];
    return [...group.members].sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0));
  }, [group]);

  const chartData = useMemo(() => {
    if (!group?.history?.length) return [];
    return group.history.map((p) => ({ at: p.at, total: p.total }));
  }, [group]);

  if (!group) return null;

  const me = group.members.find((m) => m.name === "Vous") ?? group.members[0];
  const total = group.members.filter((m) => m.paid).reduce((s, m) => s + m.amount, 0);
  const activeCount = group.members.filter((m) => m.paid).length;
  const pct = group.target > 0 ? Math.min(100, Math.round((total / group.target) * 100)) : 0;
  const inviteLink = `https://filax.app/join/${group.id.slice(0, 8)}`;
  const recentId = sorted[0]?.id;

  const add = () => {
    if (!memberName.trim()) return toast.error("Nom requis.");
    if (group.members.length >= 100) return toast.error("Maximum 100 membres atteint.");
    onAddMember(group.id, memberName.trim(), 0);
    toast.success(`${memberName} ajouté · notification envoyée à tous`);
    setMemberName("");
  };

  const deposit = (m: GroupMember) => {
    onRecordContribution(group.id, m.id, 50);
    toast.success(`${m.name} a déposé 50 USD`);
  };

  const isRecent = (m: GroupMember) => !!m.lastActivity && Date.now() - m.lastActivity < 2 * 86_400_000;

  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-brand-violet/25 bg-card/95 p-0 backdrop-blur-2xl">
        <div className="max-h-[82vh] overflow-y-auto">
          {/* Halo violet subtil en haut */}
          <div className="bg-gradient-to-b from-brand-violet/20 to-transparent px-6 pb-3 pt-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span className="text-xl">{group.icon}</span> {group.name}
              </DialogTitle>
            </DialogHeader>
          </div>

          {invite ? (
            <div className="flex flex-col items-center gap-3 px-6 pb-6 animate-fade-up">
              <div className="rounded-2xl bg-white p-3 text-black">
                <QRCode value={inviteLink} size={150} />
              </div>
              <p className="text-center text-[0.72rem] text-muted-foreground">Scannez pour rejoindre, ou partagez le lien / ID / téléphone.</p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink);
                  toast.success("Lien d'invitation copié");
                }}
                className="magnetide-tap flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-[0.72rem] font-semibold text-foreground"
              >
                <Copy className="h-3.5 w-3.5" /> {inviteLink}
              </button>
              <div className="grid w-full grid-cols-2 gap-2">
                <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Ajouter par nom" />
                <Button onClick={add} className="magnetide rounded-xl font-bold">
                  Ajouter
                </Button>
              </div>
              <Button variant="outline" onClick={() => setInvite(false)} className="w-full rounded-2xl border-white/15 bg-transparent">
                Retour
              </Button>
            </div>
          ) : (
            <div className="space-y-5 px-6 pb-6">
              {/* PROFIL UTILISATEUR ISOLÉ EN HAUT */}
              <div className="flex flex-col items-center gap-2 pt-1">
                <div className="relative">
                  <img
                    src={me.avatar}
                    alt={me.name}
                    className="h-20 w-20 rounded-full border-2 border-brand-violet/60 object-cover shadow-[0_0_24px_-6px_var(--brand-violet)]"
                    loading="lazy"
                  />
                  {me.verified && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-brand-violet">
                      <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                    </span>
                  )}
                </div>
                <p className="text-[0.66rem] uppercase tracking-widest text-brand-violet">Votre Profil</p>
                <p className="text-base font-bold text-foreground">{me.name}</p>
              </div>

              {/* STATISTIQUES — cartes épurées noir / blanc / violet */}
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Collecté" value={formatMoney(total, "USD")} accent />
                <StatCard label="Objectif" value={formatMoney(group.target, "USD")} />
                <StatCard label="Membres actifs" value={`${activeCount}/${group.members.length}`} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="magnetide h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>

              {/* GRAPHIQUE DE TENDANCE — courbe violette */}
              {chartData.length > 1 && (
                <div className="rounded-2xl border border-brand-violet/20 bg-white/[0.02] p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-brand-violet" />
                    <span className="text-[0.72rem] font-bold text-foreground">Évolution des cotisations</span>
                  </div>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="grpViolet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--brand-violet)" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="var(--brand-violet)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <YAxis hide domain={["dataMin - 200", "dataMax + 200"]} />
                        <Tooltip
                          cursor={{ stroke: "var(--brand-violet)", strokeOpacity: 0.3 }}
                          contentStyle={{
                            background: "oklch(0.2 0.02 255)",
                            border: "1px solid var(--brand-violet)",
                            borderRadius: 12,
                            fontSize: 11,
                          }}
                          labelFormatter={(_, p) => (p?.[0] ? formatDate(p[0].payload.at) : "")}
                          formatter={(v: number) => [formatMoney(v, "USD"), "Total"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="var(--brand-violet)"
                          strokeWidth={2.5}
                          fill="url(#grpViolet)"
                          dot={false}
                          activeDot={{ r: 4, fill: "var(--brand-violet)" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* SECTION MEMBRES — compteur + avatar strip déployable */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[0.78rem] font-bold text-foreground">
                    <Users className="h-3.5 w-3.5 text-brand-violet" /> Membres &amp; Cotisations
                  </p>
                  <span className="rounded-full bg-brand-violet/15 px-2.5 py-0.5 text-[0.66rem] font-bold text-brand-violet">
                    {group.members.length} Total
                  </span>
                </div>

                {/* Avatar strip — raccourci cliquable qui déploie la liste */}
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="magnetide-tap flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="flex items-center">
                    {sorted.slice(0, 6).map((m, i) => (
                      <img
                        key={m.id}
                        src={m.avatar}
                        alt={m.name}
                        loading="lazy"
                        className="h-8 w-8 rounded-full border-2 border-card object-cover"
                        style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }}
                      />
                    ))}
                    {group.members.length > 6 && (
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-brand-violet/25 text-[0.6rem] font-bold text-brand-violet"
                        style={{ marginLeft: -10 }}
                      >
                        +{group.members.length - 6}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-[0.68rem] font-semibold text-muted-foreground">
                    {expanded ? "Masquer" : "Afficher"}
                    <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </span>
                </button>

                {/* Liste verticale complète, triée dynamiquement */}
                {expanded && (
                  <div className="mt-2 space-y-2 animate-fade-up">
                    {sorted.map((m) => {
                      const mpct = m.goal > 0 ? Math.min(100, Math.round((m.amount / m.goal) * 100)) : 0;
                      const recent = m.id === recentId && isRecent(m);
                      return (
                        <div
                          key={m.id}
                          className={`rounded-2xl border px-3 py-2.5 transition-all ${
                            recent
                              ? "border-brand-violet/60 bg-brand-violet/[0.08] shadow-[0_0_20px_-8px_var(--brand-violet)]"
                              : "border-white/[0.06] bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="relative shrink-0">
                              <img
                                src={m.avatar}
                                alt={m.name}
                                className={`h-9 w-9 rounded-full object-cover ${recent ? "ring-2 ring-brand-violet" : ""}`}
                                loading="lazy"
                              />
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                                  m.paid ? "bg-brand-green" : "bg-brand-red"
                                }`}
                              />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="truncate text-[0.8rem] font-semibold text-foreground">{m.name}</span>
                                {m.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand-violet" />}
                                {recent && (
                                  <span className="flex items-center gap-0.5 rounded-full bg-brand-violet/20 px-1.5 py-0.5 text-[0.55rem] font-bold text-brand-violet">
                                    <Sparkles className="h-2.5 w-2.5" /> Vient de déposer
                                  </span>
                                )}
                              </div>
                              <span className="text-[0.66rem] text-muted-foreground">
                                {formatMoney(m.amount, "USD")} / {formatMoney(m.goal, "USD")}
                              </span>
                            </div>

                            {/* Dépôt rapide + validation/like admin */}
                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                onClick={() => deposit(m)}
                                className="magnetide-tap flex h-7 items-center justify-center rounded-lg bg-brand-green/15 px-2 text-[0.62rem] font-bold text-brand-green"
                                title="Enregistrer un dépôt"
                              >
                                + 50
                              </button>
                              <button
                                onClick={() => onToggleLike(group.id, m.id)}
                                className={`magnetide-tap flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                                  m.liked ? "bg-brand-violet text-white" : "bg-white/[0.06] text-muted-foreground"
                                }`}
                                title="Valider la cotisation"
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-brand-violet transition-all" style={{ width: `${mpct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setInvite(true)}
                className="magnetide flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[0.78rem] font-bold"
              >
                <QrCode className="h-4 w-4" /> Inviter des membres
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-2.5 text-center ${
        accent ? "border-brand-violet/40 bg-brand-violet/[0.08]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="text-[0.58rem] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-[0.78rem] font-extrabold ${accent ? "text-brand-violet" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
