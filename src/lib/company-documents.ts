export const COMPANY_DOCUMENTS = [
  {
    path: "/filax-memorandum-2026.pdf",
    filename: "FILAX-Memorandum-Officiel-2026.pdf",
    title: "FILAX — Mémorandum officiel 2026",
    description: "15 pages · Identité, modèle économique, technique, transactions, support et cadre juridique.",
  },
] as const;

export async function loadDocumentFile(path: string, filename: string): Promise<File> {
  const response = await fetch(path, { cache: "force-cache" });
  if (!response.ok) throw new Error("Document unavailable");
  const bytes = await response.arrayBuffer();
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("Invalid PDF response");
  }
  return new File([bytes], filename, { type: "application/pdf" });
}