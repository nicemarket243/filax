import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { FilaxSubPage } from "@/components/filax-sub-page";

export const Route = createFileRoute("/economie")({
  head: () => ({
    meta: [
      { title: "FILAX Économie" },
      {
        name: "description",
        content: "FILAX Économie : optimisez votre épargne et faites croître votre patrimoine.",
      },
      { property: "og:title", content: "FILAX Économie" },
      {
        property: "og:description",
        content: "FILAX Économie : optimisez votre épargne et faites croître votre patrimoine.",
      },
    ],
  }),
  component: EconomiePage,
});

function EconomiePage() {
  return (
    <FilaxSubPage
      label="Économie"
      icon={TrendingUp}
      description="Optimisez votre épargne, analysez vos dépenses et faites croître votre patrimoine intelligemment."
      accentClass="text-brand-blue"
      ringClass="border-brand-blue/40 bg-brand-blue/10"
      glowClass="shadow-[0_0_40px_-8px_oklch(0.62_0.19_250/0.6)]"
    />
  );
}
