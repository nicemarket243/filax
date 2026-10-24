/**
 * Détection du type d'identifiant de connexion FILAX.
 * Un identifiant est soit un e-mail, soit un ID FILAX (FLX-…), soit un numéro de téléphone.
 */
export type IdentifierType = "email" | "filax" | "phone";

export function detectIdentifier(raw: string): IdentifierType | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "email";
  if (/^FLX[-A-Z0-9]{3,32}$/i.test(v)) return "filax";
  const digits = v.replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 15 && /^[+()\d][\d\s().-]*$/.test(v)) return "phone";
  return null;
}

/** Normalise un numéro saisi librement en format international +… */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}
