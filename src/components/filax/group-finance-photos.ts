const photos = import.meta.glob<string>("@/assets/group-finance/group-*.jpg", { eager: true, import: "default" });
const descriptions = [
  "Cotisation collective autour du registre d'épargne",
  "Association déposant sa cagnotte à la banque",
  "Conseil financier pour une épargne commune",
  "Coopérative réunie pour compter les cotisations",
  "Club d'investissement et projets communs",
  "Entrepreneurs et conseiller bancaire",
];

export const GROUP_FINANCE_PHOTOS = Object.entries(photos)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, src], index) => ({ key, src, alt: descriptions[index % descriptions.length] ?? descriptions[0] ?? "" }));