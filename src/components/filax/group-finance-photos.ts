const photos = import.meta.glob<string>("@/assets/group-finance/group-*.jpg", { eager: true, import: "default" });
import motion4 from "@/assets/group-finance/motion-04.gif";
import motion18 from "@/assets/group-finance/motion-18.gif";
import motion29 from "@/assets/group-finance/motion-29.gif";
const motions: Record<number, string> = { 3: motion4, 17: motion18, 28: motion29 };
const descriptions = ["Achat d'une voiture", "Projet immobilier concrétisé", "Entreprise prospère", "Voyage et liberté", "Conseil financier collectif", "Célébration d'un objectif atteint"];
export const GROUP_MESSAGE_EN: Record<string, string> = {
  "FILAX — L'épargne intelligente pour vos plus grands projets.": "FILAX — Smart savings for your biggest plans.",
  "Atteignez vos objectifs financiers plus rapidement ensemble.": "Reach your financial goals faster together.",
  "Prenez le contrôle de votre avenir financier avec FILAX.": "Take control of your financial future with FILAX.",
  "Construisez votre liberté financière, une cotisation à la fois.": "Build financial freedom, one contribution at a time.",
  "Sécurisez vos économies avec la discipline FILAX.": "Protect your savings with FILAX discipline.",
};
const messages = Object.keys(GROUP_MESSAGE_EN);

export const GROUP_FINANCE_PHOTOS = Object.entries(photos)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, src], index) => ({ key, src, motion: motions[index], message: index % 2 === 0 ? messages[Math.floor(index / 2) % messages.length] : undefined, alt: descriptions[index % descriptions.length] ?? "" }));