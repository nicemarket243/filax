import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Crown,
  Target,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  LineChart,
  Star,
} from "lucide-react";

import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { PaymentModal } from "@/components/payment-modal";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "FILAX Premium — Abonnements" },
      {
        name: "description",
        content:
          "Débloquez FILAX Discipline, Économie, Investissement et Assurance avec les forfaits PRO et PREMIUM PRO.",
      },
    ],
  }),
  component: PremiumPage,
});

const plans = [
  {
    id: "pro",
    name: "PRO",
    price: "5,59",
    badge: null as string | null,
    accent: "brand-blue",
    modules: [
      { icon: TrendingUp, label: "FILAX Économie" },
      { icon: LineChart, label: "FILAX Investissement" },
    ],
    features: [
      "Suivi & analyse des dépenses",
      "Objectifs d'épargne intelligents",
      "Portefeuille d'investissement",
      "Statistiques avancées",
    ],
  },
  {
    id: "premium",
    name: "PREMIUM PRO",
    price: "19",
    badge: "RECOMMANDÉ",
    accent: "brand-violet",
    modules: [
      { icon: Target, label: "FILAX Discipline" },
      { icon: TrendingUp, label: "FILAX Économie" },
      { icon: LineChart, label: "FILAX Investissement" },
      { icon: ShieldCheck, label: "FILAX Assurance" },
    ],
    features: [
      "Tout le forfait PRO",
      "Blocages, paris & programmes IA",
      "Assurance des appareils",
      "Support prioritaire 24/7",
    ],
  },
] as const;

const accentMap: Record<string, { text: string; border: string; bg: string; glow: string; button: string }> = {
  "brand-blue": {
    text: "text-brand-blue",
    border: "border-brand-blue/30",
    bg: "from-brand-blue/12 to-transparent",
    glow: "shadow-[0_0_50px_-18px_oklch(0.62_0.19_250/0.7)]",
    button: "bg-brand-blue text-foreground hover:bg-brand-blue/90",
  },
  "brand-violet": {
    text: "text-brand-violet",
    border: "border-brand-violet/50",
    bg: "from-brand-violet/18 via-brand-blue/[0.05] to-transparent",
    glow: "shadow-[0_0_70px_-14px_oklch(0.6_0.21_300/0.85)]",
    button: "bg-gradient-to-r from-brand-violet to-brand-blue text-foreground hover:opacity-95",
  },
};

function PremiumPage() {
  const [payOpen, setPayOpen] = useState(false);
  const [selected, setSelected] = useState<{ name: string; price: string }>({ name: "", price: "" });

  const subscribe = (name: string, price: string) => {
    setSelected({ name, price });
    setPayOpen(true);
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-14 pt-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-violet/20 blur-[100px]" />

      <header className="relative flex items-center justify-between">
        <BackButton fallbackTo="/" />
        
      </header>

      <div className="relative mt-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-violet/30 bg-brand-violet/10 shadow-[0_0_40px_-8px_oklch(0.6_0.21_300/0.7)]">
          <Crown className="h-7 w-7 text-brand-violet" />
        </div>
        <h1 className="mt-4 bg-gradient-to-t from-foreground/50 to-foreground bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          Passez Premium
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Débloquez tout l'écosystème FILAX et reprenez le contrôle.
        </p>
      </div>

      <div className="relative mt-8 space-y-5">
        {plans.map((plan) => {
          const a = accentMap[plan.accent];
          const featured = plan.id === "premium";
          return (
            <div
              key={plan.id}
              className={`relative overflow-hidden rounded-3xl border ${a.border} bg-gradient-to-b ${a.bg} bg-card/40 p-5 backdrop-blur-2xl ${a.glow} ${
                featured ? "ring-1 ring-brand-violet/30" : ""
              }`}
            >
              {plan.badge && (
                <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-2xl bg-gradient-to-r from-brand-violet to-brand-blue px-3 py-1.5 text-[0.6rem] font-bold tracking-wide text-foreground">
                  <Star className="h-3 w-3 fill-current" /> {plan.badge}
                </div>
              )}

              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-extrabold ${a.text}`}>{plan.name}</span>
                    {featured && <Sparkles className="h-4 w-4 text-brand-violet" />}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">USD / mois</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {plan.modules.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[0.66rem] font-medium text-foreground/90"
                  >
                    <Icon className={`h-3.5 w-3.5 ${a.text}`} />
                    {label}
                  </span>
                ))}
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[0.78rem] text-muted-foreground">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.06] ${a.text}`}>
                      <Check className="h-3 w-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Button onClick={() => subscribe(plan.name, plan.price)} className={`mt-5 w-full ${a.button}`}>
                S'abonner — {plan.name}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="relative mt-6 flex items-center justify-center gap-1.5 text-center text-[0.68rem] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-brand-green" /> Annulable à tout moment · Paiement sécurisé
      </p>

      <PaymentModal open={payOpen} onOpenChange={setPayOpen} planName={selected.name} price={selected.price} />
    </main>
  );
}
