import { useState } from "react";
import { Plus, Target, Users, QrCode, Copy, Check, X, Trophy, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCode } from "./qr-code";
import {
  type EconomieData,
  type Group,
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
}

export function GestionTab({ data, onCreateGoal, onCreateGroup, onFundGoal, onToggleMember, onAddMember }: GestionTabProps) {
  const [openGroup, setOpenGroup] = useState<Group | null>(null);

  const daysLeft = (ts: number) => Math.max(0, Math.round((ts - Date.now()) / 86_400_000));

  return (
    <div className="space-y-6">
      {/* GOALS */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Target className="h-4 w-4 text-brand-blue" /> Objectifs financiers
          </h2>
          <button onClick={onCreateGoal} className="flex items-center gap-1 rounded-full bg-brand-blue/15 px-3 py-1.5 text-[0.7rem] font-bold text-brand-blue">
            <Plus className="h-3.5 w-3.5" /> Créer
          </button>
        </div>
        <div className="space-y-2.5">
          {data.goals.map((g) => {
            const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
            const done = pct >= 100;
            return (
              <div key={g.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${g.color}/15 text-xl`}>{g.icon}</span>
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
                  <span className={`text-sm font-bold text-${g.color}`}>{pct}%</span>
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
                      className="rounded-full bg-brand-green/15 px-3 py-1 text-[0.66rem] font-bold text-brand-green"
                    >
                      + 50 USD
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* GROUPS */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Users className="h-4 w-4 text-brand-gold" /> Groupes d'épargne
          </h2>
          <button onClick={onCreateGroup} className="flex items-center gap-1 rounded-full bg-brand-gold/15 px-3 py-1.5 text-[0.7rem] font-bold text-brand-gold">
            <Plus className="h-3.5 w-3.5" /> Créer
          </button>
        </div>
        <div className="space-y-2.5">
          {data.groups.map((grp) => {
            const total = grp.members.filter((m) => m.paid).reduce((s, m) => s + m.amount, 0);
            const pct = grp.target > 0 ? Math.min(100, Math.round((total / grp.target) * 100)) : 0;
            return (
              <button
                key={grp.id}
                onClick={() => setOpenGroup(grp)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:bg-white/[0.06] active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gold/15 text-2xl">{grp.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{grp.name}</p>
                    <p className="text-[0.7rem] text-muted-foreground">{grp.members.length} membres · {formatMoney(total, "USD")} collectés</p>
                  </div>
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </div>
                {grp.target > 0 && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-brand-gold transition-all" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <GroupDetailDialog
        group={openGroup}
        onClose={() => setOpenGroup(null)}
        onToggleMember={onToggleMember}
        onAddMember={onAddMember}
      />
    </div>
  );
}

function GroupDetailDialog({
  group,
  onClose,
  onToggleMember,
  onAddMember,
}: {
  group: Group | null;
  onClose: () => void;
  onToggleMember: (groupId: string, memberId: string) => void;
  onAddMember: (groupId: string, name: string, amount: number) => void;
}) {
  const [invite, setInvite] = useState(false);
  const [memberName, setMemberName] = useState("");

  if (!group) return null;
  const total = group.members.filter((m) => m.paid).reduce((s, m) => s + m.amount, 0);
  const inviteLink = `https://filax.app/join/${group.id.slice(0, 8)}`;

  const add = () => {
    if (!memberName.trim()) return toast.error("Nom requis.");
    if (group.members.length >= 100) return toast.error("Maximum 100 membres atteint.");
    onAddMember(group.id, memberName.trim(), 100);
    toast.success(`${memberName} ajouté · notification envoyée à tous`);
    setMemberName("");
  };

  return (
    <Dialog open={!!group} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-white/10 bg-card/95 p-0 backdrop-blur-2xl">
        <div className="bg-gradient-to-b from-brand-gold/15 to-transparent px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{group.icon}</span> {group.name}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 pb-6">
          {invite ? (
            <div className="flex flex-col items-center gap-3 animate-fade-up">
              <div className="rounded-2xl bg-white p-3 text-black">
                <QRCode value={inviteLink} size={150} />
              </div>
              <p className="text-[0.72rem] text-muted-foreground">Scannez pour rejoindre, ou partagez le lien / ID / téléphone.</p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink);
                  toast.success("Lien d'invitation copié");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-[0.72rem] font-semibold text-foreground"
              >
                <Copy className="h-3.5 w-3.5" /> {inviteLink}
              </button>
              <div className="grid w-full grid-cols-2 gap-2">
                <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Ajouter par nom" />
                <Button onClick={add} className="rounded-xl bg-brand-gold font-bold text-background hover:bg-brand-gold/90">
                  Ajouter
                </Button>
              </div>
              <Button variant="outline" onClick={() => setInvite(false)} className="w-full rounded-2xl border-white/15 bg-transparent">
                Retour
              </Button>
            </div>
          ) : (
            <>
              {group.description && <p className="text-[0.74rem] text-muted-foreground">{group.description}</p>}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[0.64rem] text-muted-foreground">Collecté</p>
                  <p className="text-lg font-extrabold text-brand-green">{formatMoney(total, "USD")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[0.64rem] text-muted-foreground">Objectif</p>
                  <p className="text-lg font-extrabold text-foreground">{formatMoney(group.target, "USD")}</p>
                </div>
              </div>

              <button
                onClick={() => setInvite(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gold py-3 text-[0.78rem] font-bold text-background"
              >
                <QrCode className="h-4 w-4" /> Inviter des membres
              </button>

              <div>
                <p className="mb-2 text-[0.72rem] font-bold text-foreground">Cotisations</p>
                <div className="space-y-1.5">
                  {group.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-foreground">
                        {m.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="flex-1 text-[0.78rem] font-semibold text-foreground">{m.name}</span>
                      <span className="text-[0.72rem] text-muted-foreground">{formatMoney(m.amount, "USD")}</span>
                      <button
                        onClick={() => onToggleMember(group.id, m.id)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                          m.paid ? "bg-brand-green/20 text-brand-green" : "bg-brand-red/15 text-brand-red"
                        }`}
                      >
                        {m.paid ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
