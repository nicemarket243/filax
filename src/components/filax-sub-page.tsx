import { type LucideIcon } from "lucide-react";
import { FilaxLogo } from "@/components/filax-logo";
import { BackButton } from "@/components/back-button";

interface FilaxSubPageProps {
  label: string;
  description: string;
  icon: LucideIcon;
  accentClass: string;
  ringClass: string;
  glowClass: string;
}

export function FilaxSubPage({
  label,
  description,
  icon: Icon,
  accentClass,
  ringClass,
  glowClass,
}: FilaxSubPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-12 pt-7">
      <header className="flex items-center justify-between">
        <BackButton fallbackTo="/" />
        <FilaxLogo />
      </header>


      <div className="mt-16 flex flex-col items-center text-center animate-fade-up">
        <span
          className={`flex h-20 w-20 items-center justify-center rounded-full border ${ringClass} ${glowClass}`}
        >
          <Icon className={`h-10 w-10 ${accentClass}`} />
        </span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground">
          FILAX <span className={accentClass}>{label}</span>
        </h1>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-card/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Cette section est en cours de construction.
        </p>
      </div>
    </main>
  );
}
