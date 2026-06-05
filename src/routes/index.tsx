import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Send, Mic, Target, BarChart3, ShieldCheck } from "lucide-react";
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
  { to: "/economie", label: "Économie", icon: BarChart3, accent: "brand-blue" },
  { to: "/assurance", label: "Assurance", icon: ShieldCheck, accent: "brand-red" },
] as const;

const accentStyles: Record<
  string,
  { border: string; glow: string; iconWrap: string; icon: string; text: string; bar: string; line: string }
> = {
  "brand-green": {
    border: "border-brand-green/30",
    glow: "shadow-[0_8px_40px_-12px_oklch(0.74_0.2_148/0.5)]",
    iconWrap:
      "border-brand-green/50 bg-gradient-to-br from-brand-green/30 to-brand-green/5 shadow-[0_0_22px_-4px_oklch(0.74_0.2_148/0.7)]",
    icon: "text-brand-green",
    text: "text-brand-green",
    bar: "bg-brand-green",
    line: "via-brand-green/40",
  },
  "brand-blue": {
    border: "border-brand-blue/30",
    glow: "shadow-[0_8px_40px_-12px_oklch(0.62_0.19_250/0.5)]",
    iconWrap:
      "border-brand-blue/50 bg-gradient-to-br from-brand-blue/30 to-brand-blue/5 shadow-[0_0_22px_-4px_oklch(0.62_0.19_250/0.7)]",
    icon: "text-brand-blue",
    text: "text-brand-blue",
    bar: "bg-brand-blue",
    line: "via-brand-blue/40",
  },
  "brand-red": {
    border: "border-brand-red/30",
    glow: "shadow-[0_8px_40px_-12px_oklch(0.64_0.22_22/0.5)]",
    iconWrap:
      "border-brand-red/50 bg-gradient-to-br from-brand-red/30 to-brand-red/5 shadow-[0_0_22px_-4px_oklch(0.64_0.22_22/0.7)]",
    icon: "text-brand-red",
    text: "text-brand-red",
    bar: "bg-brand-red",
    line: "via-brand-red/40",
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
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden px-6 pb-12 pt-7">
      {/* Header — logo & Premium parfaitement alignés sur le même axe */}
      <header className="flex items-center justify-between">
        <FilaxLogo className="animate-fade-up" height={38} />
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-brand-gold/25 bg-card/40 px-3 py-1 text-xs font-semibold text-foreground/90 backdrop-blur transition-colors hover:border-brand-gold/45 hover:bg-card/60"
        >
          <Crown className="h-3.5 w-3.5 text-brand-gold" />
          Premium
        </button>
      </header>

      {/* Espace vide aéré entre le logo et le cœur IA, puis points rapprochés du titre */}
      <div className="mt-24 flex justify-center">
        <RadarGraphic className="h-56 w-56" active={radarActive} />
      </div>

      {/* Hero title — se termine par un point */}
      <h1 className="mt-10 text-center text-4xl font-extrabold leading-tight tracking-tight text-foreground">
        Prenez le contrôle
        <br />
        de votre vie.
      </h1>

      {/* Command bar — design & icônes identiques à la référence (envoi puis micro) */}
      <form
        onSubmit={handleSubmit}
        className="group relative mt-10 flex items-center gap-2 rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-2 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-colors focus-within:border-brand-green/40"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Que voulez-vous faire aujourd'hui ?"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-[oklch(0.6_0.17_150)] text-primary-foreground shadow-[0_4px_16px_-2px_oklch(0.74_0.2_148/0.6)] transition-all hover:scale-105 active:scale-95"
        >
          <Send className="h-[1.15rem] w-[1.15rem] -translate-x-px translate-y-px" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Commande vocale"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-foreground/80 transition-all hover:bg-white/10 hover:text-foreground"
        >
          <Mic className="h-5 w-5" strokeWidth={2} />
        </button>
      </form>

      {/* Feature cards — icône décalée à gauche + fine ligne intérieure */}
      <div className="mt-12 grid grid-cols-3 gap-3">
        {cards.map(({ to, label, icon: Icon, accent }) => {
          const s = accentStyles[accent];
          return (
            <Link
              key={to}
              to={to}
              className={`group relative flex flex-col rounded-2xl border bg-gradient-to-b from-card/70 to-card/20 px-3 pb-4 pt-4 backdrop-blur transition-all hover:-translate-y-1 ${s.border} ${s.glow}`}
            >
              {/* Icône épurée, décalée légèrement sur la gauche */}
              <span
                className={`ml-0.5 flex h-11 w-11 items-center justify-center rounded-full border ${s.iconWrap}`}
              >
                <Icon className={`h-[1.35rem] w-[1.35rem] ${s.icon}`} strokeWidth={2} />
              </span>

              {/* Fine ligne horizontale interne */}
              <span
                className={`mt-3 h-px w-full bg-gradient-to-r from-transparent ${s.line} to-transparent`}
              />

              {/* Texte avec barre d'accent verticale */}
              <span className="mt-3 flex items-center gap-2">
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

      {/* Rotating quote — sur une seule ligne + ligne verte sous l'auteur */}
      <QuoteRotator className="mt-10" />
    </main>
  );
}
