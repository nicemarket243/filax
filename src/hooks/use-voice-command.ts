import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in lib.dom for all targets)
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec: SpeechRecognitionLike = new Ctor();
  rec.lang = "fr-FR";
  rec.continuous = false;
  rec.interimResults = true;
  return rec;
}

export interface VoiceState {
  listening: boolean;
  transcript: string;
  supported: boolean;
}

/**
 * Voice capture hook based on the Web Speech API. Fully client-side, no backend.
 * Falls back gracefully when the browser does not support speech recognition.
 */
export function useVoiceCommand(onFinal: (text: string) => void) {
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(!!getRecognition());
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const rec = getRecognition();
    if (!rec) {
      setSupported(false);
      return false;
    }
    recRef.current = rec;
    setTranscript("");
    setListening(true);

    rec.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        onFinalRef.current(text.trim());
      }
    };
    rec.onerror = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };

    try {
      rec.start();
    } catch {
      /* already started */
    }
    return true;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { listening, transcript, supported, start, stop } as const;
}

export type ParsedIntent =
  | { module: "blocages"; action: "block"; target: string; durationDays?: number }
  | { module: "paris"; action: "create"; amount?: number; durationDays?: number }
  | { module: "programmes"; action: "create"; title: string; when?: string }
  | { module: "unknown"; raw: string };

const DAY_WORDS: Record<string, number> = {
  heure: 1 / 24,
  heures: 1 / 24,
  jour: 1,
  jours: 1,
  semaine: 7,
  semaines: 7,
  mois: 30,
  an: 365,
  ans: 365,
  année: 365,
  années: 365,
};

/** Lightweight French intent parser to route a spoken command to a module. */
export function parseIntent(raw: string): ParsedIntent {
  const t = raw.toLowerCase();

  const durationMatch = t.match(/(\d+)\s*(heures?|jours?|semaines?|mois|ans?|années?)/);
  const duration = durationMatch
    ? Math.round(parseInt(durationMatch[1], 10) * (DAY_WORDS[durationMatch[2]] ?? 1))
    : undefined;

  if (/(bloque|bloquer|blocage|interdis)/.test(t)) {
    const known = ["tiktok", "instagram", "facebook", "snapchat", "youtube", "twitter", "x", "netflix"];
    const found = known.find((k) => t.includes(k));
    const target = found ? found.charAt(0).toUpperCase() + found.slice(1) : "Application";
    return { module: "blocages", action: "block", target, durationDays: duration };
  }

  if (/(pari|parie|parier|enjeu|mise|miser)/.test(t)) {
    const amountMatch = t.match(/(\d+)\s*(dollars?|usd|\$|euros?)/);
    const amount = amountMatch ? parseInt(amountMatch[1], 10) : undefined;
    return { module: "paris", action: "create", amount, durationDays: duration };
  }

  if (/(réunion|reunion|rendez-vous|rdv|programme|événement|evenement|sport|étude|etude|travail|ajoute|crée|cree|planifie)/.test(t)) {
    return { module: "programmes", action: "create", title: raw.trim(), when: durationMatch?.[0] };
  }

  return { module: "unknown", raw };
}
