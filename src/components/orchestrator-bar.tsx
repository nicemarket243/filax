import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Send, AudioLines, Loader2, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";

import { useVoiceCommand } from "@/hooks/use-voice-command";
import { orchestrateCommand, type OrchestratorIntent } from "@/lib/orchestrator.functions";
import { setPendingIntent } from "@/lib/pending-intent";

interface OrchestratorBarProps {
  /** Notifie le parent quand la barre est active (focus, écoute, saisie) pour animer le radar. */
  onActiveChange?: (active: boolean) => void;
}

type Phase = "idle" | "thinking" | "answer";

const MODULE_LABEL: Record<string, string> = {
  discipline: "FILAX Discipline",
  economie: "FILAX Économie",
  assurance: "FILAX Assurance",
  unknown: "FILAX",
};

/**
 * Orchestrateur Central — barre de commande intelligente.
 * Capture texte + voix, route la requête vers le bon module via l'IA et exige
 * une confirmation humaine pour toute action sensible.
 */
export function OrchestratorBar({ onActiveChange }: OrchestratorBarProps) {
  const navigate = useNavigate();
  const runOrchestrator = useServerFn(orchestrateCommand);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reply, setReply] = useState("");
  const [intent, setIntent] = useState<OrchestratorIntent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Exécute l'intention validée : dépose-la puis navigue vers le module cible.
  const execute = useCallback(
    (it: OrchestratorIntent) => {
      if (it.module === "unknown") return;
      setPendingIntent({ module: it.module, action: it.action, params: it.params, reply: it.reply });
      setPhase("idle");
      setReply("");
      setIntent(null);
      setQuery("");
      navigate({ to: `/${it.module}` });
    },
    [navigate],
  );

  // Envoie la commande à l'IA orchestratrice.
  const submit = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      setPhase("thinking");
      setReply("");
      setIntent(null);
      try {
        const result = await runOrchestrator({ data: { text: clean } });
        setReply(result.reply);
        setIntent(result);
        setPhase("answer");
        // Action non sensible et exploitable → on route immédiatement.
        if (result.module !== "unknown" && !result.sensitive) {
          setTimeout(() => execute(result), 550);
        }
      } catch {
        setPhase("answer");
        setReply("Une erreur est survenue. Réessayez dans un instant.");
        setIntent(null);
        toast.error("Orchestrateur indisponible", { description: "Vérifiez votre connexion." });
      }
    },
    [runOrchestrator, execute],
  );

  // Réponse vocale/texte pendant une confirmation.
  const interpretConfirmation = useCallback(
    (text: string): boolean => {
      const t = text.toLowerCase();
      if (!intent || !intent.sensitive) return false;
      if (/(oui|confirme|confirmer|valide|valider|d'accord|ok|vas-y|c'est bon)/.test(t)) {
        execute(intent);
        return true;
      }
      if (/(non|annule|annuler|stop|laisse|abandonne)/.test(t)) {
        setPhase("idle");
        setReply("");
        setIntent(null);
        setQuery("");
        toast("Action annulée");
        return true;
      }
      return false;
    },
    [intent, execute],
  );

  const onVoiceFinal = useCallback(
    (text: string) => {
      if (!text) return;
      setQuery(text);
      if (interpretConfirmation(text)) return;
      void submit(text);
    },
    [interpretConfirmation, submit],
  );

  const { listening, transcript, supported, start, stop } = useVoiceCommand(onVoiceFinal);

  // Affiche la transcription en direct dans le champ pendant l'écoute.
  useEffect(() => {
    if (listening && transcript) setQuery(transcript);
  }, [listening, transcript]);

  const active = focused || listening || query.trim().length > 0 || phase !== "idle";
  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  const handleMic = useCallback(async () => {
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
        stream.getTracks().forEach((tr) => tr.stop());
      } catch {
        toast.error("Accès au micro refusé", { description: "Autorisez le microphone pour parler à FILAX." });
        return;
      }
    }
    const ok = start();
    if (ok) toast("À l'écoute…", { description: "Dites par exemple : « Verrouille mon compte Mariage »." });
  }, [listening, supported, start, stop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listening) stop();
    if (phase === "answer" && intent?.sensitive && interpretConfirmation(query)) return;
    void submit(query);
  };

  const cancel = () => {
    setPhase("idle");
    setReply("");
    setIntent(null);
    setQuery("");
    inputRef.current?.focus();
  };

  const awaitingConfirm = phase === "answer" && !!intent && intent.sensitive && intent.module !== "unknown";

  return (
    <div className="mt-7">
      <form
        onSubmit={handleSubmit}
        className="command-bar group relative flex items-center gap-2 rounded-full p-1.5 backdrop-blur-xl"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={listening ? "À l'écoute…" : "Dites-nous ce que vous voulez faire."}
          className="min-w-0 flex-1 bg-transparent px-4 text-[0.72rem] text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="submit"
          aria-label="Envoyer la commande"
          disabled={phase === "thinking"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue/40 via-brand-green/25 to-brand-red/40 text-foreground shadow-[0_0_14px_-4px_oklch(0.62_0.19_250/0.5)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
        >
          {phase === "thinking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-[1rem] w-[1rem]" strokeWidth={2.2} />}
        </button>
        <button
          type="button"
          onClick={handleMic}
          aria-label="Commande vocale"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
            listening
              ? "bg-brand-red/20 text-brand-red animate-pulse"
              : "bg-brand-red/[0.04] text-foreground/70 hover:bg-brand-blue/[0.1] hover:text-foreground"
          }`}
        >
          <AudioLines className="h-[1.05rem] w-[1.05rem]" strokeWidth={2.2} />
        </button>
      </form>

      {/* Panneau de réponse / confirmation de l'orchestrateur */}
      {phase === "answer" && reply && (
        <div className="mt-3 animate-fade-up rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-xl">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              {intent && intent.module !== "unknown" && (
                <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {MODULE_LABEL[intent.module]}
                </p>
              )}
              <p className="mt-0.5 text-[0.8rem] leading-snug text-foreground">{reply}</p>

              {awaitingConfirm && intent && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => execute(intent)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-green px-3 py-2 text-[0.72rem] font-semibold text-background transition-all active:scale-[0.97]"
                  >
                    <Check className="h-3.5 w-3.5" /> Confirmer
                  </button>
                  <button
                    type="button"
                    onClick={cancel}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-[0.72rem] font-semibold text-foreground/80 transition-all active:scale-[0.97]"
                  >
                    <X className="h-3.5 w-3.5" /> Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
