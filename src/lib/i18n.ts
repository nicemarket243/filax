import { useSyncExternalStore } from "react";

export type Lang = "fr" | "en";
const LANG_KEY = "filax-lang";

/** Dictionnaire FR → EN. La clé est le texte français affiché. */
const EN: Record<string, string> = {
  Accueil: "Home",
  Groupes: "Groups",
  Analyse: "Analytics",
  Profil: "Profile",
  "Groupes de cotisation": "Savings groups",
  "Épargnez ensemble, suivez chaque contribution.": "Save together, track every contribution.",
  "Créer un groupe": "Create a group",
  "Mon profil": "My profile",
  "Analyse financière": "Financial analytics",
  "Prenez le contrôle de vos finances": "Take control of your finances",
  Langue: "Language",
  Français: "French",
  Anglais: "English",
  Sécurité: "Security",
  Apparence: "Appearance",
  "Mode clair ou sombre": "Light or dark mode",
  "Double authentification": "Two-factor authentication",
  Cotiser: "Contribute",
  Inviter: "Invite",
  Collecté: "Collected",
  Objectif: "Target",
};

let lang: Lang = "fr";
const listeners = new Set<() => void>();
if (typeof window !== "undefined" && localStorage.getItem(LANG_KEY) === "en") lang = "en";

export function setLang(next: Lang) {
  lang = next;
  localStorage.setItem(LANG_KEY, next);
  document.documentElement.lang = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function translate(text: string, l: Lang) {
  return l === "en" ? (EN[text] ?? text) : text;
}

export function useI18n() {
  const current = useSyncExternalStore(subscribe, () => lang, () => "fr" as Lang);
  return { lang: current, setLang, t: (text: string) => translate(text, current) };
}
