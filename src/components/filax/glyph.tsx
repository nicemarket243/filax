import {
  Briefcase,
  Building2,
  Church,
  Gem,
  GraduationCap,
  Handshake,
  Heart,
  Home,
  Landmark,
  LifeBuoy,
  PartyPopper,
  Plane,
  Rocket,
  ShoppingBag,
  Sparkles,
  TreePalm,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Correspondance entre les icônes stockées (emoji) et un jeu de pictogrammes
 * professionnels : même sémantique, rendu sobre et cohérent avec une fintech.
 */
const MAP: Record<string, LucideIcon> = {
  "💼": Briefcase,
  "🇨🇩": Landmark,
  "💍": Gem,
  "👨‍👩‍👧": Users,
  "🚀": Rocket,
  "🏢": Building2,
  "🏝️": TreePalm,
  "🚨": LifeBuoy,
  "🏠": Home,
  "🎓": GraduationCap,
  "✈️": Plane,
  "🏍️": Wallet,
  "🛒": ShoppingBag,
  "🕊️": Heart,
  "🎉": PartyPopper,
  "⛪": Church,
  "🤝": Handshake,
};

export function glyphFor(icon: string): LucideIcon {
  return MAP[icon] ?? Sparkles;
}

/** Pictogramme professionnel d'un compte / groupe / objectif. */
export function Glyph({ icon, className }: { icon: string; className?: string }) {
  const Icon = glyphFor(icon);
  return <Icon className={className ?? "h-4 w-4"} strokeWidth={1.7} />;
}
