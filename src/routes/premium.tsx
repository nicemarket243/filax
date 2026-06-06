import { createFileRoute } from "@tanstack/react-router";
import { Check, Crown, Target, TrendingUp, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { FilaxLogo } from "@/components/filax-logo";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "FILAX Premium — Abonnements" },
      {
        name: "description",
        content:
          "Débloquez FILAX Discipline, Économie et Assurance avec les forfaits PRO et PREMIUM de FILAX.",
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
    badge: "Le plus populaire",
    accent: "brand-blue",
    modules: [
      { icon: Target, label: "FILAX Discipline" },
      { icon: TrendingUp, label: "FILAX Économie" },
    ],
    features: ["Blocage applicatif & sites", "Paris sur soi", "Programmes IA", "Statistiques avancées"],
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: "19,99",
    badge: "Recommandé",
    accent: "brand-violet",
    modules: [
      { icon: Target, label: "FILAX Discipline" },
      { icon: TrendingUp, label: "FILAX Économie" },
      { icon: ShieldCheck, label: "FILAX Assurance" },
    ],
    features: [
      "Tout le forfait PRO",
      "Assurance des appareils",
      "Remboursement 20% en cas de perte",
      "Support prioritaire",
    ],
  },
] as const;

const accentMap: Record<string, { text: string; border: string; bg: string; glow: string; button: string }> = {
  "brand-blue": {
    text: "text-brand-blue",
    border: "border-brand-blue/40",
    bg: "from-brand-blue/15 to-transparent",
    glow: "shadow-[0_0_50px_-16px_oklch(0.62_0.19_250/0.7)]",
    button: "bg-brand-blue text-foreground hover:bg-brand-blue/90",
  },
  "brand-violet": {
    text: "text-brand-violet",
    border: "border-brand-violet/50",
    bg: "from-brand-violet/20 to-transparent",
    glow: "shadow-[0_0_60px_-14px_oklch(0.6_0.21_300/0.8)]",
    button: "bg-brand-violet text-foreground hover:bg-brand-violet/90",
  },
};

function PremiumPage() {
  const handleSubscribe = (name: string, price: string) => {
    toast.success(`Forfait ${name} sélectionné — ${price} USD / mois`, {
      description: "Le paiement sécurisé sera disponible très bientôt.",
    });
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-14 pt-6">
      <header className="flex items-center justify-between">
        <BackButton fallbackTo="/" />
        <FilaxLogo className="filax-logo-fade" height={22} />
      </header>

      <div className="mt-10 text-center">
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

      <div className="mt-8 space-y-5">
        {plans.map((plan) => {
          const a = accentMap[plan.accent];
          return (
            <div
              key={plan.id}
              className={`relative overflow-hidden rounded-3xl border ${a.border} bg-gradient-to-b ${a.bg} bg-card/40 p-5 backdrop-blur-xl ${a.glow}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-extrabold ${a.text}`}>{plan.name}</span>
                    {plan.id === "premium" && <Sparkles className="h-4 w-4 text-brand-violet" />}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">USD / mois</span>
                  </div>
                </div>
                <span
                  className={`rounded-full border ${a.border} bg-white/[0.04] px-2.5 py-1 text-[0.6rem] font-semibold ${a.text}`}
                >
                  {plan.badge}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {plan.modules.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.68rem] font-medium text-foreground/90"
                  >
                    <Icon className={`h-3.5 w-3.5 ${a.text}`} />
                    {label}
                  </span>
                ))}
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[0.78rem] text-muted-foreground">
                    <Check className={`h-4 w-4 shrink-0 ${a.text}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.name, plan.price)}
                className={`mt-5 w-full ${a.button}`}
              >
                Choisir {plan.name}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[0.68rem] text-muted-foreground">
        Annulable à tout moment. Paiement sécurisé.
      </p>
    </main>
  );
}
