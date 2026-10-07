import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Plus, UserPlus, Users, Banknote } from "lucide-react";
import { toast } from "sonner";
import groupSlideOne from "@/assets/groups-solidarity-1.jpg";
import groupSlideTwo from "@/assets/groups-solidarity-2.jpg";
import groupSlideThree from "@/assets/groups-solidarity-3.jpg";

import { AppHeader, BottomNav } from "@/components/filax/shell";
import { Coffre } from "@/components/filax/coffre";
import { Glyph } from "@/components/filax/glyph";
import { Field, Modal, PrimaryButton, TextInput, PageTitle, ProgressBar, accentVar } from "@/components/filax/ui-kit";
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
import {
  contributeDb,
  createDbGroup,
  inviteDb,
  useDbAccounts,
  useDbGroups,
  requestGroupWithdrawalDb,
  useDbUser,
} from "@/lib/filax-db";

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

const GROUP_SLIDES = [groupSlideOne, groupSlideTwo, groupSlideThree];

function GroupHeroSlideshow() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setSlide((current) => (current + 1) % GROUP_SLIDES.length), 7000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="relative mt-4 aspect-[16/8.5] overflow-hidden rounded-3xl bg-muted soft-shadow" aria-label="Solidarité et épargne collective">
      {GROUP_SLIDES.map((image, index) => (
        <img
          key={image}
          src={image}
          alt="Amis réunis autour d'une épargne commune"
          width={1536}
          height={864}
          loading={index === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 motion-reduce:transition-none ${index === slide ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/60 to-transparent" />
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {GROUP_SLIDES.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Afficher l'image ${index + 1}`}
            aria-current={index === slide}
            onClick={() => setSlide(index)}
            className={`magnetide-tap h-1.5 rounded-full bg-foreground transition-all ${index === slide ? "w-5 opacity-90" : "w-1.5 opacity-45"}`}
          />
        ))}
      </div>
    </section>
  );
}

function GroupesPage() {
  const filax = useFilax();
  const userId = useDbUser();
  const { groups: dbGroups, refresh: refreshGroups } = useDbGroups(userId);
  const { accounts: dbAccounts, refresh: refreshAccounts } = useDbAccounts(userId);
  // Données réelles si connecté, démonstration sinon.
  const groups = dbGroups ?? filax.data.groups;
  const accounts = dbAccounts ?? filax.data.accounts;
  const { profile } = filax.data;
  const [modal, setModal] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);

  // Le groupe affiché dans le détail reste synchronisé avec le store après cotisation.
  const current = group ? (groups.find((g) => g.id === group.id) ?? group) : null;
  const { t } = useI18n();
  const [hideAmounts, setHideAmounts] = useState(false);
  const isOwner = !!dbGroups && !!current && current.ownerId === userId;
  const [wdAmount, setWdAmount] = useState("");
  const [wdReason, setWdReason] = useState("");
  const [wdAccount, setWdAccount] = useState("");
  const wdAccounts = current ? accounts.filter((a) => a.currency === current.currency) : [];
  const daysLeft = (d?: number) => (d ? Math.max(0, Math.ceil((d - Date.now()) / 86400000)) : null);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <AppHeader />

      <PageTitle title="Groupes de cotisation" subtitle="Épargnez ensemble, suivez chaque contribution." />

      <GroupHeroSlideshow />

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
              subtitle={t(`${list.length} groupe${list.length > 1 ? "s" : ""}`)}
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
                             <p className="text-[0.62rem] text-muted-foreground">
                               {t(`${g.members.length} membre${g.members.length > 1 ? "s" : ""}`)}
                             </p>
                          </div>
                        </div>
                        <span className="text-[0.75rem] font-bold" style={{ color: accentVar("brand-violet") }}>
                          {formatMoney(total, g.currency)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-1.5">
                        {sortedMembers(g)
                          .slice(0, 6)
                          .map((m) =>
                            m.avatar ? (
                              <img
                                key={m.id}
                                src={m.avatar}
                                alt={m.name}
                                className="h-7 w-7 rounded-full object-cover ring-2 ring-surface"
                              />
                            ) : (
                              <span
                                key={m.id}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-violet/15 text-[0.6rem] font-bold text-brand-violet ring-2 ring-surface"
                              >
                                {m.name.slice(0, 1).toUpperCase()}
                              </span>
                            ),
                          )}
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
                  {m.avatar ? (
                    <img src={m.avatar} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-violet/15 text-[0.65rem] font-bold text-brand-violet">
                      {m.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
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
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setWdAccount(wdAccounts[0]?.id ?? "");
                  setModal("withdraw");
                }}
                className="press flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-[0.75rem] font-bold text-foreground"
              >
                <Banknote className="h-3.5 w-3.5" /> {t("Demander un retrait")}
              </button>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={modal === "withdraw" && !!current}
        onOpenChange={(o) => !o && setModal(current ? "detail" : null)}
        title="Demander un retrait"
        subtitle="La demande est validée par le back-office FILAX avant le versement."
      >
        <div className="space-y-4">
          <Field label="Compte de réception">
            <select
              value={wdAccount}
              onChange={(e) => setWdAccount(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-[0.8rem] text-foreground"
            >
              {wdAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Montant">
            <TextInput inputMode="decimal" placeholder="0.00" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} />
          </Field>
          <Field label="Motif">
            <TextInput placeholder="Achat du terrain" value={wdReason} onChange={(e) => setWdReason(e.target.value)} />
          </Field>
          <PrimaryButton
            disabled={!wdAccount || !(Number(wdAmount) > 0)}
            onClick={async () => {
              try {
                await requestGroupWithdrawalDb(current!.id, wdAccount, Number(wdAmount), wdReason.trim());
              } catch (e) {
                toast.error("Demande refusée", { description: (e as Error).message });
                return;
              }
              toast.success("Demande envoyée", { description: "En attente de validation." });
              setWdAmount("");
              setWdReason("");
              setModal("detail");
            }}
          >
            Envoyer la demande
          </PrimaryButton>
        </div>
      </Modal>

      <NewGroupModal
        open={modal === "new"}
        onOpenChange={(o) => !o && setModal(null)}
        onConfirm={async (g) => {
          if (userId) {
            await createDbGroup({ name: g.name, category: "Famille", target: g.target, currency: g.currency });
            await refreshGroups();
          } else {
            filax.createGroup(g);
          }
        }}
      />
      <ContributeModal
        open={modal === "contribute"}
        onOpenChange={(o) => !o && setModal(null)}
        group={current}
        accounts={accounts}
        onConfirm={async (groupId, amount, accountId, pin) => {
          if (userId) {
            await contributeDb(groupId, accountId, amount, pin);
            await Promise.all([refreshGroups(), refreshAccounts()]);
          } else {
            filax.contribute(groupId, amount, accountId);
          }
        }}
      />
      <InviteModal
        open={modal === "invite"}
        onOpenChange={(o) => !o && setModal(null)}
        filaxId={profile.filaxId}
        onAddMember={
          current
            ? async (identifier) => {
                if (userId) {
                  await inviteDb(current.id, identifier);
                  await refreshGroups();
                } else {
                  filax.addMember(current.id, identifier);
                }
              }
            : undefined
        }
      />

      <BottomNav />
    </main>
  );
}
