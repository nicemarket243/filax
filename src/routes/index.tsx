import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, SendHorizontal, Mic, Target, LineChart, ShieldCheck } from "lucide-react";
import { FilaxLogo } from "@/components/filax-logo";
import { RadarGraphic } from "@/components/radar-graphic";
import { QuoteRotator } from "@/components/quote-rotator";

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
  { to: "/economie", label: "Économie", icon: LineChart, accent: "brand-blue" },
  { to: "/assurance", label: "Assurance", icon: ShieldCheck, accent: "brand-red" },
] as const;

const accentStyles: Record<
  string,
  { glow: string; iconWrap: string; icon: string; text: string; bar: string; line: string }
> = {
  "brand-green": {
    glow: "shadow-[0_8px_36px_-16px_oklch(0.72_0.22_140/0.45)]",
    iconWrap:
      "border-brand-green/50 bg-gradient-to-br from-brand-green/35 to-brand-green/5 shadow-[0_0_20px_-4px_oklch(0.72_0.22_140/0.7)]",
    icon: "text-brand-green",
    text: "text-brand-green",
    bar: "bg-brand-green",
    line: "via-brand-green/35",
  },
  "brand-blue": {
    glow: "shadow-[0_8px_36px_-16px_oklch(0.62_0.19_250/0.45)]",
    iconWrap:
      "border-brand-blue/50 bg-gradient-to-br from-brand-blue/35 to-brand-blue/5 shadow-[0_0_20px_-4px_oklch(0.62_0.19_250/0.7)]",
    icon: "text-brand-blue",
    text: "text-brand-blue",
    bar: "bg-brand-blue",
    line: "via-brand-blue/35",
  },
  "brand-red": {
    glow: "shadow-[0_8px_36px_-16px_oklch(0.64_0.22_22/0.45)]",
    iconWrap:
      "border-brand-red/50 bg-gradient-to-br from-brand-red/35 to-brand-red/5 shadow-[0_0_20px_-4px_oklch(0.64_0.22_22/0.7)]",
    icon: "text-brand-red",
    text: "text-brand-red",
    bar: "bg-brand-red",
    line: "via-brand-red/35",
  },
};

function Index() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  // The dot matrix reacts when the user is typing or focused on the command bar.
  const radarActive = focused || query.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Commande FILAX :", query);
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden px-6 pb-12 pt-6">
      {/* Header — logo & Premium alignés sur le même axe horizontal */}
      <header className="flex items-center justify-between">
        <FilaxLogo className="animate-fade-up" height={34} />
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full bg-brand-gold/[0.06] px-3 py-1.5 text-xs font-semibold text-foreground/90 transition-colors hover:bg-brand-gold/[0.12]"
        >
          <Crown className="h-3.5 w-3.5 text-brand-gold" />
          Premium
        </button>
      </header>

      {/* Sphère IA descendue — large espace d'aération sous le logo */}
      <div className="mt-16 flex justify-center">
        <RadarGraphic className="h-56 w-56" active={radarActive} />
      </div>

      {/* Hero title — descendu vers la barre de commande, terminé par un point */}
      <h1 className="mt-20 text-center text-4xl font-extrabold leading-tight tracking-tight text-foreground">
        Prenez le contrôle
        <br />
        de votre vie.
      </h1>

      {/* Command bar — bordure verte avec lueur réactive */}
      <form
        onSubmit={handleSubmit}
        className="command-bar group relative mt-6 flex items-center gap-2 rounded-[1.75rem] border bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-1.5 backdrop-blur-xl"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Dites-nous ce que vous voulez faire."
          className="min-w-0 flex-1 bg-transparent px-4 text-[0.8rem] text-foreground outline-none placeholder:text-muted-foreground/80"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-[oklch(0.6_0.18_142)] text-primary-foreground shadow-[0_3px_12px_-2px_oklch(0.72_0.22_140/0.6)] transition-all hover:scale-105 active:scale-95"
        >
          <SendHorizontal className="h-4 w-4 -translate-x-px" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Commande vocale"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-foreground/80 transition-all hover:bg-white/10 hover:text-foreground"
        >
          <Mic className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>

      {/* Feature cards — rectangles, icône débordante à gauche, ligne interne fine */}
      <div className="mt-9 grid grid-cols-3 gap-3 pt-5">
        {cards.map(({ to, label, icon: Icon, accent }) => {
          const s = accentStyles[accent];
          return (
            <Link
              key={to}
              to={to}
              className={`group relative flex h-28 flex-col justify-end rounded-2xl border border-white/[0.06] bg-gradient-to-b from-card/60 to-card/15 px-3 pb-3.5 backdrop-blur transition-all hover:-translate-y-1 ${s.glow}`}
            >
              {/* Icône épurée — 50% débordant en haut, décalée à gauche */}
              <span
                className={`absolute -top-5 left-3 flex h-10 w-10 items-center justify-center rounded-full border ${s.iconWrap}`}
              >
                <Icon className={`h-[1.2rem] w-[1.2rem] ${s.icon}`} strokeWidth={2} />
              </span>

              {/* Fine ligne horizontale interne, très subtile */}
              <span
                className={`mb-3 h-px w-full bg-gradient-to-r from-transparent ${s.line} to-transparent`}
              />

              {/* Texte avec barre d'accent verticale */}
              <span className="flex items-center gap-2">
                <span className={`h-7 w-[2px] shrink-0 rounded-full ${s.bar}`} />
                <span className="leading-tight">
                  <span className="block text-[0.8rem] font-bold text-foreground">FILAX</span>
                  <span className={`block text-[0.8rem] font-semibold ${s.text}`}>{label}</span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Rotating quote — une seule ligne + ligne verte sous l'auteur */}
      <QuoteRotator className="mt-10" />
    </main>
  );
}
