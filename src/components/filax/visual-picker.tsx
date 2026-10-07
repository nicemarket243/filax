import { Button } from "@/components/ui/button";
import { ACCOUNT_VISUALS } from "./account-visuals";

export function VisualPicker({ value, onChange, disabled = false }: { value: string; onChange: (key: string) => void; disabled?: boolean }) {
  return <div className="grid grid-cols-3 gap-2">
    {ACCOUNT_VISUALS.map((visual) => <Button key={visual.key} type="button" variant="ghost" disabled={disabled} aria-pressed={value === visual.key} aria-label={visual.label} onClick={() => onChange(visual.key)} className={`h-auto min-w-0 flex-col gap-1 overflow-hidden rounded-lg p-1 ${value === visual.key ? "ring-2 ring-brand-blue bg-accent" : ""}`}>
      <img src={visual.src} alt="" loading="lazy" width={480} height={320} className="aspect-square w-full rounded-md object-cover" />
      <span className="w-full truncate text-center text-[0.65rem] text-foreground">{visual.label}</span>
    </Button>)}
  </div>;
}