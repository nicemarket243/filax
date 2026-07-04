import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useVoiceCommand, parseIntent, type ParsedIntent } from "@/hooks/use-voice-command";

interface VoiceButtonProps {
  onIntent: (intent: ParsedIntent) => void;
  className?: string;
  /** Compact icon-only variant used inside other buttons/cards. */
  compact?: boolean;
  label?: string;
}

/**
 * Universal "micro IA" button. Captures speech (Web Speech API), parses the
 * French command locally and routes the resulting intent to the right module.
 */
export function VoiceButton({ onIntent, className, compact, label = "Parler à l'IA" }: VoiceButtonProps) {
  const { listening, transcript, supported, start, stop } = useVoiceCommand((text) => {
    if (!text) return;
    const intent = parseIntent(text);
    onIntent(intent);
  });

  const handleClick = async () => {
    if (listening) {
      stop();
      return;
    }
    if (!supported) {
      toast.error("La reconnaissance vocale n'est pas disponible sur ce navigateur.", {
        description: "Essayez Chrome ou Safari récent.",
      });
      return;
    }
    // Sollicite explicitement l'autorisation micro avant d'écouter.
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Libère immédiatement : la reconnaissance vocale rouvre son propre flux.
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        toast.error("Accès au micro refusé", {
          description: "Autorisez le microphone dans les réglages pour parler à l'IA.",
        });
        return;
      }
    }
    const ok = start();
    if (ok) toast("À l'écoute…", { description: "Dites par exemple : « Bloque TikTok pendant 30 jours »." });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 ${
          listening
            ? "border-brand-red/60 bg-brand-red/15 text-brand-red animate-pulse"
            : "border-white/10 bg-white/[0.06] text-foreground/80 hover:border-brand-green/40 hover:text-brand-green"
        } ${className ?? ""}`}
      >
        {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
          listening
            ? "border-brand-red/50 bg-brand-red/10 text-brand-red"
            : "border-white/10 bg-gradient-to-r from-brand-green/15 via-brand-blue/10 to-brand-violet/15 text-foreground hover:border-white/25"
        }`}
      >
        {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-brand-green" />}
        {listening ? "Arrêter l'écoute" : label}
      </button>
      {listening && transcript && (
        <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs text-muted-foreground">
          « {transcript} »
        </p>
      )}
    </div>
  );
}
