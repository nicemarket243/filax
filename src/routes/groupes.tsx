import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Plus, UserPlus, Users } from "lucide-react";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { Coffre } from "@/components/filax/coffre";
import { Glyph } from "@/components/filax/glyph";
import { Modal, PageTitle, ProgressBar, accentVar } from "@/components/filax/ui-kit";
import { ContributeModal, InviteModal, NewGroupModal } from "@/components/filax/action-modals";
import {
  GROUP_CATEGORIES,
  formatDate,
  formatMoney,
  groupCategory,
  groupTotal,
  myContribution,
  pct,
  sortedMembers,
  useFilax,
  type Group,
} from "@/lib/filax-store";

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

  // Le groupe affiché dans le détail reste synchronisé avec le store après cotisation.
  const current = group ? (groups.find((g) => g.id === group.id) ?? group) : null;
  const { t } = useI18n();
  const [hideAmounts, setHideAmounts] = useState(false);
  const daysLeft = (d?: number) => (d ? Math.max(0, Math.ceil((d - Date.now()) / 86400000)) : null);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />

      <PageTitle title="Groupes de cotisation" subtitle="Épargnez ensemble, suivez chaque contribution." />

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setModal("new")}
          className="press flex items-center gap-1 rounded-full bg-brand-violet/10 px-3 py-1.5 text-[0.7rem] font-bold text-brand-violet"
        >
          <Plus className="h-3.5 w-3.5" /> {t("Créer un groupe")}
        </button>
      </div>

      {/* Tiroirs par catégorie, fermés par défaut. */}
      <div className="mt-4 space-y-3">
        {GROUP_CATEGORIES.map((cat) => {
          const list = groups.filter((g) => groupCategory(g) === cat);
          if (list.length === 0) return null;
          return (
            <Coffre
              key={cat}
              title={cat}
              subtitle={`${list.length} groupe${list.length > 1 ? "s" : ""}`}
              icon={<Users className="h-4 w-4" />}
              badge={`${list.length}`}
            >
              <div className="space-y-2.5">
                {list.map((g) => {
                  const total = groupTotal(g);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setGroup(g);
                        setModal("detail");
                      }}
                      className="press block w-full rounded-2xl bg-muted/50 p-3 text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-surface">
                            <Glyph icon={g.icon} className="h-4 w-4 text-brand-violet" />
                          </span>
                          <div className="leading-tight">
                            <p className="text-[0.85rem] font-bold text-foreground">{g.name}</p>
                            <p className="text-[0.62rem] text-muted-foreground">{g.members.length} membres</p>
                          </div>
                        </div>
                        <span className="text-[0.75rem] font-bold" style={{ color: accentVar("brand-violet") }}>
                          {formatMoney(total, g.currency)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-1.5">
                        {sortedMembers(g)
                          .slice(0, 6)
                          .map((m) => (
                            <img
                              key={m.id}
                              src={m.avatar}
                              alt={m.name}
                              className="h-7 w-7 rounded-full object-cover ring-2 ring-surface"
                            />
                          ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Coffre>
          );
        })}

        {groups.length === 0 && (
          <p className="rounded-2xl bg-muted/40 px-3 py-5 text-center text-[0.72rem] text-muted-foreground">
            Aucun groupe pour l'instant. Créez le premier.
          </p>
        )}
      </div>

      {/* Détail du groupe : membres triés du plus récent au plus ancien. */}
      <Modal
        open={modal === "detail" && !!current}
        onOpenChange={(o) => !o && setModal(null)}
        title={current?.name ?? ""}
        subtitle={current?.description}
      >
        {current && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/50 p-3">
              <div className="flex items-end justify-between">
                <div className="leading-tight">
                  <p className="text-[0.62rem] text-muted-foreground">Collecté</p>
                  <p className="text-[1.15rem] font-extrabold text-foreground">
                    {formatMoney(groupTotal(current), current.currency)}
                  </p>
                </div>
                <p className="text-[0.65rem] text-muted-foreground">
                  Objectif {formatMoney(current.target, current.currency)}
                </p>
              </div>
              <div className="mt-2">
                <ProgressBar value={pct(groupTotal(current), current.target)} color="brand-violet" />
              </div>
              {daysLeft(current.deadline) !== null && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-violet/10 px-2.5 py-1 text-[0.65rem] font-bold text-brand-violet">
                  ⏳ {daysLeft(current.deadline)} jours restants
                </span>
              )}
              <p className="mt-2 text-[0.65rem] text-muted-foreground">
                Votre contribution : {formatMoney(myContribution(current), current.currency)}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-3 py-2.5">
              <p className="text-[0.74rem] font-bold text-foreground">Masquer les montants des membres</p>
              <button
                type="button"
                role="switch"
                aria-checked={hideAmounts}
                aria-label="Masquer les montants des membres"
                onClick={() => setHideAmounts((v) => !v)}
                className="press relative h-6 w-11 shrink-0 rounded-full transition"
                style={{ backgroundColor: hideAmounts ? accentVar("brand-green") : "var(--muted-foreground)" }}
              >
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: hideAmounts ? "1.5rem" : "0.125rem" }} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[0.68rem] font-semibold text-muted-foreground">
                Membres · de la cotisation la plus récente à la plus ancienne
              </p>
              {sortedMembers(current).map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 rounded-2xl bg-muted/40 px-3 py-2">
                  <img src={m.avatar} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[0.76rem] font-semibold text-foreground">{m.name}</p>
                    <p className="text-[0.6rem] text-muted-foreground">
                      {m.lastAt ? `Dernière cotisation ${formatDate(m.lastAt)}` : "Aucune cotisation"}
                    </p>
                  </div>
                  <span className="text-[0.75rem] font-bold" style={{ color: accentVar("brand-violet") }}>
                    {hideAmounts ? "•••" : formatMoney(m.amount, current.currency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModal("contribute")}
                className="press rounded-xl py-2.5 text-[0.75rem] font-bold text-white"
                style={{ backgroundColor: accentVar("brand-violet") }}
              >
                {t("Cotiser")}
              </button>
              <button
                type="button"
                onClick={() => setModal("invite")}
                className="press flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-[0.75rem] font-bold text-foreground"
              >
                <UserPlus className="h-3.5 w-3.5" /> {t("Inviter")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <NewGroupModal open={modal === "new"} onOpenChange={(o) => !o && setModal(null)} onConfirm={filax.createGroup} />
      <ContributeModal
        open={modal === "contribute"}
        onOpenChange={(o) => !o && setModal(null)}
        group={current}
        accounts={accounts}
        onConfirm={filax.contribute}
      />
      <InviteModal
        open={modal === "invite"}
        onOpenChange={(o) => !o && setModal(null)}
        filaxId={profile.filaxId}
        onAddMember={current ? (name) => filax.addMember(current.id, name) : undefined}
      />

      <BottomNav />
    </main>
  );
}
