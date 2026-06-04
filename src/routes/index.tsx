import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Send, Mic, Target, TrendingUp, ShieldCheck } from "lucide-react";
import { FilaxLogo } from "@/components/filax-logo";
import { RadarGraphic } from "@/components/radar-graphic";

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
  {
    to: "/discipline",
    label: "Discipline",
    icon: Target,
    accent: "brand-green",
  },
  {
    to: "/economie",
    label: "Économie",
    icon: TrendingUp,
    accent: "brand-blue",
  },
  {
    to: "/assurance",
    label: "Assurance",
    icon: ShieldCheck,
    accent: "brand-red",
  },
] as const;

const accentStyles: Record<
  string,
  { border: string; glow: string; icon: string; ring: string; text: string }
> = {
  "brand-green": {
    border: "border-brand-green/40",
    glow: "shadow-[0_0_28px_-6px_oklch(0.74_0.2_148/0.55)]",
    icon: "text-brand-green",
    ring: "border-brand-green/40 bg-brand-green/10",
    text: "text-brand-green",
  },
  "brand-blue": {
    border: "border-brand-blue/40",
    glow: "shadow-[0_0_28px_-6px_oklch(0.62_0.19_250/0.55)]",
    icon: "text-brand-blue",
    ring: "border-brand-blue/40 bg-brand-blue/10",
    text: "text-brand-blue",
  },
  "brand-red": {
    border: "border-brand-red/40",
    glow: "shadow-[0_0_28px_-6px_oklch(0.64_0.22_22/0.55)]",
    icon: "text-brand-red",
    ring: "border-brand-red/40 bg-brand-red/10",
    text: "text-brand-red",
  },
};

function Index() {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder action for the search command.
    console.log("FILAX command:", query);
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden px-6 pb-12 pt-7">
      {/* Header */}
      <header className="flex items-center justify-between">
        <FilaxLogo className="animate-fade-up" />
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-gold/50 hover:bg-card"
        >
          <Crown className="h-4 w-4 text-brand-gold" />
          Premium
        </button>
      </header>

      {/* Radar graphic */}
      <div className="mt-10 flex justify-center">
        <RadarGraphic className="h-64 w-64" />
      </div>

      {/* Hero title */}
      <h1 className="mt-8 text-center text-4xl font-extrabold leading-tight tracking-tight text-foreground">
        Prenez le contrôle
        <br />
        de votre vie
      </h1>

      {/* Search bar */}
      <form
        onSubmit={handleSubmit}
        className="mt-8 flex items-center gap-2 rounded-3xl border border-border bg-card/60 p-2.5 backdrop-blur"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Que voulez-vous faire aujourd'hui ?"
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Envoyer"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-green/40 bg-brand-green/15 text-brand-green transition-colors hover:bg-brand-green/25"
        >
          <Send className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Commande vocale"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <Mic className="h-5 w-5" />
        </button>
      </form>

      {/* Feature cards */}
      <div className="mt-7 grid grid-cols-3 gap-3">
        {cards.map(({ to, label, icon: Icon, accent }) => {
          const s = accentStyles[accent];
          return (
            <Link
              key={to}
              to={to}
              className={`group flex flex-col items-center gap-3 rounded-2xl border bg-card/50 p-3 text-center transition-all hover:-translate-y-0.5 ${s.border} ${s.glow}`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full border ${s.ring}`}
              >
                <Icon className={`h-6 w-6 ${s.icon}`} />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold text-foreground">FILAX</span>
                <span className={`block text-sm font-semibold ${s.text}`}>{label}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Quote */}
      <figure className="mt-10 px-2 text-center">
        <span className="block text-3xl font-serif leading-none text-brand-green">“</span>
        <blockquote className="mt-1 text-lg font-medium italic text-foreground">
          "Discipline today, freedom tomorrow."
        </blockquote>
        <figcaption className="mt-3 text-sm font-medium text-brand-green">— Jim Rohn</figcaption>
      </figure>
    </main>
  );
}
