import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Target, TrendingUp, ShieldCheck } from "lucide-react";
import { FilaxLogo } from "@/components/filax-logo";
import { RadarGraphic } from "@/components/radar-graphic";
import { QuoteRotator } from "@/components/quote-rotator";
import { OrchestratorBar } from "@/components/orchestrator-bar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FILAX — Prenez le contrôle de votre vie" },
      {
        name: "description",
        content:
          "FILAX Finance : discipline, économie et assurance réunies pour reprendre le contrôle de votre vie financière.",
      },
      { property: "og:title", content: "FILAX — Prenez le contrôle de votre vie" },
      {
        property: "og:description",
        content:
          "FILAX Finance : discipline, économie et assurance pour reprendre le contrôle de votre vie financière.",
      },
    ],
  }),
  component: Index,
});

const cards = [
  { to: "/discipline", label: "Discipline", icon: Target, accent: "brand-green" },
  { to: "/economie", label: "Économie", icon: TrendingUp, accent: "brand-blue" },
  { to: "/assurance", label: "Assurance", icon: ShieldCheck, accent: "brand-red" },
] as const;

const accentStyles: Record<
  string,
  { glow: string; iconWrap: string; icon: string; text: string; bar: string }
> = {
  "brand-green": {
    glow: "shadow-[0_8px_32px_-18px_oklch(0.72_0.22_140/0.45)]",
    iconWrap:
      "border-brand-green/40 bg-gradient-to-br from-brand-green/30 to-brand-green/[0.04] shadow-[0_0_22px_-6px_oklch(0.72_0.22_140/0.6)]",
    icon: "text-brand-green",
    text: "text-brand-green",
    bar: "bg-brand-green",
  },
  "brand-blue": {
    glow: "shadow-[0_8px_32px_-18px_oklch(0.62_0.19_250/0.45)]",
    iconWrap:
      "border-brand-blue/40 bg-gradient-to-br from-brand-blue/30 to-brand-blue/[0.04] shadow-[0_0_22px_-6px_oklch(0.62_0.19_250/0.6)]",
    icon: "text-brand-blue",
    text: "text-brand-blue",
    bar: "bg-brand-blue",
  },
  "brand-red": {
    glow: "shadow-[0_8px_32px_-18px_oklch(0.64_0.22_22/0.45)]",
    iconWrap:
      "border-brand-red/40 bg-gradient-to-br from-brand-red/30 to-brand-red/[0.04] shadow-[0_0_22px_-6px_oklch(0.64_0.22_22/0.6)]",
    icon: "text-brand-red",
    text: "text-brand-red",
    bar: "bg-brand-red",
  },
};

function Index() {
  // Le radar réagit quand l'orchestrateur est actif (focus, saisie, écoute, réflexion).
  const [radarActive, setRadarActive] = useState(false);


  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden px-6 pb-12 pt-6">
      {/* Header — logo cliquable & Premium alignés sur la même ligne de base */}
      <header className="flex items-end justify-between">
        <Link to="/inscription" aria-label="Ouvrir la vérification et l'inscription FILAX">
          <FilaxLogo className="filax-logo-fade animate-fade-up" height={26} />
        </Link>
        <Link
          to="/premium"
          className="flex items-center gap-1 rounded-full border border-brand-violet/30 bg-brand-violet/[0.1] px-2 py-0.5 text-[0.6rem] font-semibold leading-none text-foreground/90 shadow-[0_0_14px_-6px_oklch(0.6_0.21_300/0.8)] transition-all hover:bg-brand-violet/20 active:scale-95"
        >
          <Crown className="h-2.5 w-2.5 text-brand-violet" />
          Premium
        </Link>
      </header>


      {/* Sphère IA descendue vers le titre — grand espace d'aération en haut */}
      <div className="mt-24 flex justify-center">
        <RadarGraphic className="h-52 w-52" active={radarActive} />
      </div>

      {/* Hero title — dégradé gris (bas) vers blanc (haut), terminé par un point */}
      <h1 className="mt-6 bg-gradient-to-t from-foreground/45 via-foreground/80 to-foreground bg-clip-text text-center text-4xl font-extrabold leading-tight tracking-tight text-transparent">
        Prenez le contrôle
        <br />
        de votre vie.
      </h1>

      {/* Orchestrateur Central — barre de commande intelligente (texte + voix + IA) */}
      <OrchestratorBar onActiveChange={setRadarActive} />


      {/* Cartes — compactes, icône premium débordant 50% en haut */}
      <div className="mt-12 grid grid-cols-3 gap-3">
        {cards.map(({ to, label, icon: Icon, accent }) => {
          const s = accentStyles[accent];
          return (
            <Link
              key={to}
              to={to}
              className={`group relative flex h-[4.5rem] items-center rounded-2xl border border-white/[0.06] bg-gradient-to-b from-card/60 to-card/15 px-3 backdrop-blur transition-all hover:-translate-y-1 ${s.glow}`}
            >
              {/* Icône épurée — 50% débordant en haut, alignée à gauche */}
              <span
                className={`absolute -top-5 left-3 flex h-10 w-10 items-center justify-center rounded-full border ${s.iconWrap}`}
              >
                <Icon className={`h-5 w-5 ${s.icon}`} strokeWidth={2} />
              </span>

              {/* Texte avec barre d'accent verticale */}
              <span className="mt-2 flex items-center gap-2">
                <span className={`h-7 w-[2px] shrink-0 rounded-full ${s.bar}`} />
                <span className="leading-tight">
                  <span className="block text-[0.78rem] font-bold text-foreground">FILAX</span>
                  <span className={`block text-[0.78rem] font-semibold ${s.text}`}>{label}</span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Citation rotative — une seule ligne + ligne verte sous l'auteur */}
      <QuoteRotator className="mt-10" />
    </main>
  );
}
