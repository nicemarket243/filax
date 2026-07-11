import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, ShieldPlus, AlertTriangle } from "lucide-react";

import { BackButton } from "@/components/back-button";
import { useAssuranceStore } from "@/components/assurance/store";
import { AccueilTab } from "@/components/assurance/accueil-tab";
import { AssurerTab } from "@/components/assurance/assurer-tab";
import { SinistreTab } from "@/components/assurance/sinistre-tab";

export const Route = createFileRoute("/assurance")({
  head: () => ({
    meta: [
      { title: "FILAX Assurance — Protégez vos appareils" },
      {
        name: "description",
        content: "FILAX Assurance : assurez vos téléphones, tablettes et ordinateurs contre la perte et le vol.",
      },
      { property: "og:title", content: "FILAX Assurance" },
      {
        property: "og:description",
        content: "Assurez vos appareils contre la perte et le vol avec FILAX Assurance.",
      },
    ],
  }),
  component: AssurancePage,
});

type Tab = "accueil" | "assurer" | "sinistre";

const TABS: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: "accueil", label: "Accueil", icon: Home },
  { key: "assurer", label: "Assurer", icon: ShieldPlus },
  { key: "sinistre", label: "Signaler", icon: AlertTriangle },
];

function AssurancePage() {
  const store = useAssuranceStore();
  const [tab, setTab] = useState<Tab>("accueil");

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <BackButton fallbackTo="/" />
        
      </header>

      <div className="mt-5 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          FILAX <span className="text-brand-green">Assurance</span>
        </h1>
        <p className="mt-1 text-[0.78rem] text-muted-foreground">Protégez vos appareils, partout.</p>
      </div>

      <div className="mt-6 animate-fade-up">
        {tab === "accueil" && <AccueilTab data={store.data} onAssurer={() => setTab("assurer")} />}
        {tab === "assurer" && <AssurerTab onRegister={store.addDevice} onDone={() => setTab("accueil")} />}
        {tab === "sinistre" && <SinistreTab data={store.data} onDeclare={store.addClaim} />}
      </div>

      {/* Barre de navigation glassmorphism · onglet actif souligné en vert */}
      <nav className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 items-center justify-around rounded-full border border-white/15 bg-white/[0.06] p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-full py-2 text-[0.62rem] font-semibold transition-all ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              {t.label}
              {active && <span className="absolute -bottom-0.5 h-0.5 w-7 rounded-full bg-brand-green" />}
            </button>
          );
        })}
      </nav>
    </main>
  );
}
