import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { FilaxSubPage } from "@/components/filax-sub-page";

export const Route = createFileRoute("/assurance")({
  head: () => ({
    meta: [
      { title: "FILAX Assurance" },
      {
        name: "description",
        content: "FILAX Assurance : protégez votre avenir et celui de vos proches.",
      },
      { property: "og:title", content: "FILAX Assurance" },
      {
        property: "og:description",
        content: "FILAX Assurance : protégez votre avenir et celui de vos proches.",
      },
    ],
  }),
  component: AssurancePage,
});

function AssurancePage() {
  return (
    <FilaxSubPage
      label="Assurance"
      icon={ShieldCheck}
      description="Protégez votre avenir et celui de vos proches avec des solutions d'assurance adaptées à vos besoins."
      accentClass="text-brand-red"
      ringClass="border-brand-red/40 bg-brand-red/10"
      glowClass="shadow-[0_0_40px_-8px_oklch(0.64_0.22_22/0.6)]"
    />
  );
}
