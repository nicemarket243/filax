import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { FilaxSubPage } from "@/components/filax-sub-page";

export const Route = createFileRoute("/discipline")({
  head: () => ({
    meta: [
      { title: "FILAX Discipline" },
      {
        name: "description",
        content: "FILAX Discipline : bâtissez des habitudes financières solides au quotidien.",
      },
      { property: "og:title", content: "FILAX Discipline" },
      {
        property: "og:description",
        content: "FILAX Discipline : bâtissez des habitudes financières solides au quotidien.",
      },
    ],
  }),
  component: DisciplinePage,
});

function DisciplinePage() {
  return (
    <FilaxSubPage
      label="Discipline"
      icon={Target}
      description="Fixez vos objectifs, suivez vos progrès et bâtissez des habitudes financières solides jour après jour."
      accentClass="text-brand-green"
      ringClass="border-brand-green/40 bg-brand-green/10"
      glowClass="shadow-[0_0_40px_-8px_oklch(0.74_0.2_148/0.6)]"
    />
  );
}
