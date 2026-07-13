import { Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useVoiceCommand, parseIntent, type ParsedIntent } from "@/hooks/use-voice-command";
import { useState } from "react";

interface CommandBarProps {
  onIntent: (intent: ParsedIntent) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Barre de commande compacte : uniquement un champ + l'icône micro.
 * Placeholder : « Dites-moi ce que vous voulez ». Aucun autre texte.
 */
export function CommandBar({
  onIntent,
  placeholder = "Dites-moi ce que vous voulez",
  className,
}: CommandBarProps) {
  const [text, setText] = useState("");
  const { listening, transcript, supported, start, stop } = useVoiceCommand((spoken) => {
    if (!spoken) return;
    setText("");
    onIntent(parseIntent(spoken));
  });

  const submit = () => {
    const clean = text.trim();
    if (!clean) return;
    setText("");
    onIntent(parseIntent(clean));
  };

  const handleMic = async () => {
    if (listening) {
      stop();
      return;
    }
    if (!supported) {
      toast.error("Reconnaissance vocale indisponible", { description: "Essayez Chrome ou Safari récent." });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        toast.error("Accès au micro refusé", { description: "Autorisez le microphone dans les réglages." });
        return;
      }
    }
    if (start()) toast("À l'écoute…");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1.5 pl-4 backdrop-blur-xl ${className ?? ""}`}
    >
      <input
        value={listening ? transcript : text}
        onChange={(e) => setText(e.target.value)}
        placeholder={listening ? "À l'écoute…" : placeholder}
        className="min-w-0 flex-1 bg-transparent text-[0.8rem] text-foreground outline-none placeholder:text-muted-foreground/70"
      />
      <button
        type="button"
        onClick={handleMic}
        aria-label="Commande vocale"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
          listening
            ? "bg-brand-red/20 text-brand-red animate-pulse"
            : "bg-brand-green/15 text-brand-green hover:bg-brand-green/25"
        }`}
      >
        {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
      </button>
    </form>
  );
}
