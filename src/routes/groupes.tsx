import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, UserPlus } from "lucide-react";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { ProgressBar, SectionTitle, accentVar } from "@/components/filax/ui-kit";
import { ContributeModal, InviteModal, NewGroupModal } from "@/components/filax/action-modals";
import { formatMoney, groupTotal, pct, useFilax, type Group } from "@/lib/filax-store";

export const Route = createFileRoute("/groupes")({
  head: () => ({
    meta: [
      { title: "Groupes de cotisation — FILAX" },
      { name: "description", content: "Créez un groupe, invitez vos proches et suivez la cagnotte commune en temps réel." },
      { property: "og:title", content: "Groupes de cotisation FILAX" },
      { property: "og:description", content: "Mariage, voyage, église ou business : cotisez ensemble en toute transparence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupesPage,
});

function GroupesPage() {
  const filax = useFilax();
  const { groups, accounts, profile } = filax.data;
  const [modal, setModal] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />

      <PageTitle title="Groupes de cotisation" subtitle="Épargnez ensemble, suivez chaque contribution." />


      <div className="mt-5">
        <SectionTitle
          title={`${groups.length} groupe${groups.length > 1 ? "s" : ""}`}
          action={
            <button type="button" onClick={() => setModal("new")} className="press flex items-center gap-1 text-[0.7rem] font-semibold text-brand-blue">
              <Plus className="h-3.5 w-3.5" /> Créer
            </button>
          }
        />

        <div className="space-y-3">
          {groups.map((g) => {
            const total = groupTotal(g);
            return (
              <article key={g.id} className="rounded-3xl border border-border bg-surface p-4 soft-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-lg">{g.icon}</span>
                    <div className="leading-tight">
                      <p className="text-[0.88rem] font-bold text-foreground">{g.name}</p>
                      <p className="text-[0.65rem] text-muted-foreground">{g.description}</p>
                    </div>
                  </div>
                  <span className="text-[0.7rem] font-bold" style={{ color: accentVar("brand-violet") }}>
                    {pct(total, g.target)}%
                  </span>
                </div>

                <div className="mt-3">
                  <ProgressBar value={pct(total, g.target)} color="brand-violet" />
                  <p className="mt-1.5 text-[0.68rem] text-muted-foreground">
                    {formatMoney(total, g.currency)} collectés sur {formatMoney(g.target, g.currency)}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  {g.members.slice(0, 6).map((m) => (
                    <img
                      key={m.id}
                      src={m.avatar}
                      alt={m.name}
                      title={`${m.name} · ${formatMoney(m.amount, g.currency)}`}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-surface"
                    />
                  ))}
                  <span className="ml-1 text-[0.65rem] text-muted-foreground">{g.members.length} membres</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGroup(g);
                      setModal("contribute");
                    }}
                    className="press rounded-xl py-2.5 text-[0.75rem] font-bold text-white"
                    style={{ backgroundColor: accentVar("brand-green") }}
                  >
                    Cotiser
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroup(g);
                      setModal("invite");
                    }}
                    className="press flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-[0.75rem] font-bold text-foreground"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Inviter
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <NewGroupModal open={modal === "new"} onOpenChange={(o) => !o && setModal(null)} onConfirm={filax.createGroup} />
      <ContributeModal
        open={modal === "contribute"}
        onOpenChange={(o) => !o && setModal(null)}
        group={group}
        accounts={accounts}
        onConfirm={filax.contribute}
      />
      <InviteModal
        open={modal === "invite"}
        onOpenChange={(o) => !o && setModal(null)}
        filaxId={profile.filaxId}
        onAddMember={group ? (name) => filax.addMember(group.id, name) : undefined}
      />

      <BottomNav />
    </main>
  );
}
