import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * L'Orchestrateur Central FILAX — le "cerveau" de la barre de commande.
 * Analyse une requête (texte ou voix transcrite) et retourne une intention
 * structurée : quel module est sollicité, quelle action, ses paramètres, si
 * l'action est sensible (confirmation humaine requise) et une réponse parlée.
 */

export type OrchestratorModule = "discipline" | "economie" | "assurance" | "unknown";

export interface OrchestratorIntent {
  module: OrchestratorModule;
  action: string;
  params: Record<string, unknown>;
  sensitive: boolean;
  reply: string;
}

const Input = z.object({ text: z.string().trim().min(1).max(600) });

const SYSTEM = `Tu es l'Orchestrateur Central de FILAX, un super-assistant financier francophone.
FILAX possède trois modules :
1. "discipline" — blocage d'applications/sites, duels de productivité, programmes & rendez-vous.
2. "economie" — comptes bancaires, dépôts, retraits, virements, verrouillage d'un compte, objectifs & groupes d'épargne. Comptes existants : "Compte principal", "Épargne Moto", "Compte CDF", "Mariage".
3. "assurance" — assurer un appareil (téléphone, tablette, ordinateur), déclarer un sinistre.

Analyse la commande de l'utilisateur et réponds STRICTEMENT en JSON valide (aucun texte autour), avec ce schéma :
{
  "module": "discipline" | "economie" | "assurance" | "unknown",
  "action": string,
  "params": object,
  "sensitive": boolean,
  "reply": string
}

Actions autorisées par module :
- discipline : "block_app" (params: {"target": string, "durationDays": number}), "create_duel" (params: {"title": string, "opponent": string, "stake": number, "durationDays": number}), "create_program" (params: {"title": string}), "navigate" (params: {})
- economie : "lock_account" (params: {"accountName": string, "durationDays": number}), "deposit" (params: {"accountName": string, "amount": number}), "withdraw" (params: {"accountName": string, "amount": number}), "transfer" (params: {"amount": number}), "navigate" (params: {})
- assurance : "assure" (params: {}), "declare_claim" (params: {}), "navigate" (params: {})
- unknown : "none" (params: {}) quand la demande ne correspond à aucun module.

Règles :
- "sensitive" doit être true pour TOUTE modification d'état financier ou de sécurité : lock_account, deposit, withdraw, transfer, et tout blocage/suppression. false pour la simple navigation ou consultation.
- Pour "durationDays", convertis (1 semaine = 7, 1 mois = 30, 1 an = 365). Valeur par défaut 30 si non précisé.
- "reply" : une phrase courte, chaleureuse et en français. Si sensitive, formule-la comme une demande de confirmation, ex : "Voulez-vous vraiment verrouiller le compte Mariage pendant 30 jours ?".
- Si la commande est vague, choisis "navigate" vers le module le plus probable.
- Réponds uniquement avec l'objet JSON.`;

/** Repli local (sans IA) : routage heuristique simple pour ne jamais bloquer. */
function localFallback(raw: string): OrchestratorIntent {
  const t = raw.toLowerCase();
  const durMatch = t.match(/(\d+)\s*(jours?|semaines?|mois|ans?|années?)/);
  const unit = durMatch?.[2] ?? "";
  const mult = /semaine/.test(unit) ? 7 : /mois/.test(unit) ? 30 : /an/.test(unit) ? 365 : 1;
  const durationDays = durMatch ? parseInt(durMatch[1], 10) * mult : 30;

  const accounts = ["mariage", "moto", "principal", "cdf"];
  const foundAccount = accounts.find((a) => t.includes(a));

  if (/(verrouille|verrouiller|bloque|bloquer).*(compte|épargne|epargne|mariage|moto|principal|cdf)/.test(t) || (foundAccount && /(verrouille|bloque)/.test(t))) {
    const nameMap: Record<string, string> = { mariage: "Mariage", moto: "Épargne Moto", principal: "Compte principal", cdf: "Compte CDF" };
    const accountName = foundAccount ? nameMap[foundAccount] : "Compte principal";
    return { module: "economie", action: "lock_account", params: { accountName, durationDays }, sensitive: true, reply: `Voulez-vous vraiment verrouiller le compte ${accountName} pendant ${durationDays} jours ?` };
  }
  if (/(bloque|bloquer|interdis|blocage)/.test(t)) {
    const apps = ["tiktok", "instagram", "facebook", "snapchat", "youtube", "twitter", "netflix"];
    const app = apps.find((a) => t.includes(a));
    const target = app ? app.charAt(0).toUpperCase() + app.slice(1) : "Application";
    return { module: "discipline", action: "block_app", params: { target, durationDays }, sensitive: false, reply: `Je bloque ${target} pendant ${durationDays} jours.` };
  }
  if (/(dépôt|depot|dépose|depose|déposer|deposer|verse|verser)/.test(t)) {
    return { module: "economie", action: "deposit", params: {}, sensitive: true, reply: "Voulez-vous effectuer un dépôt ?" };
  }
  if (/(retrait|retire|retirer)/.test(t)) {
    return { module: "economie", action: "withdraw", params: {}, sensitive: true, reply: "Voulez-vous effectuer un retrait ?" };
  }
  if (/(virement|transfert|transfère|transfere|envoie|envoyer)/.test(t)) {
    return { module: "economie", action: "transfer", params: {}, sensitive: true, reply: "Voulez-vous lancer un transfert ?" };
  }
  if (/(assur|téléphone|telephone|appareil|ordinateur|tablette)/.test(t)) {
    if (/(sinistre|vol|volé|vole|perdu|perte|cassé|casse)/.test(t)) return { module: "assurance", action: "declare_claim", params: {}, sensitive: false, reply: "J'ouvre la déclaration de sinistre." };
    return { module: "assurance", action: "assure", params: {}, sensitive: false, reply: "J'ouvre l'assurance de vos appareils." };
  }
  if (/(programme|rendez-vous|rdv|réunion|reunion|sport|étude|etude|planifie|agenda)/.test(t)) {
    return { module: "discipline", action: "create_program", params: { title: raw.trim() }, sensitive: false, reply: "J'ouvre la création de programme." };
  }
  if (/(compte|banque|épargne|epargne|argent|solde|objectif)/.test(t)) {
    return { module: "economie", action: "navigate", params: {}, sensitive: false, reply: "J'ouvre FILAX Économie." };
  }
  if (/(duel|défi|defi|challenge)/.test(t)) {
    return { module: "discipline", action: "navigate", params: {}, sensitive: false, reply: "J'ouvre les duels de productivité." };
  }
  return { module: "unknown", action: "none", params: {}, sensitive: false, reply: "Je n'ai pas bien compris. Essayez par exemple : « Verrouille mon compte Mariage » ou « Bloque TikTok pendant 30 jours »." };
}

function normalize(obj: unknown, raw: string): OrchestratorIntent {
  if (!obj || typeof obj !== "object") return localFallback(raw);
  const o = obj as Record<string, unknown>;
  const module = (["discipline", "economie", "assurance", "unknown"].includes(String(o.module))
    ? o.module
    : "unknown") as OrchestratorModule;
  const action = typeof o.action === "string" && o.action ? o.action : "navigate";
  const params = o.params && typeof o.params === "object" ? (o.params as Record<string, unknown>) : {};
  let sensitive = Boolean(o.sensitive);
  // Garde-fou serveur : toute opération financière/sécurité est TOUJOURS sensible.
  if (module === "economie" && ["lock_account", "deposit", "withdraw", "transfer"].includes(action)) sensitive = true;
  const reply = typeof o.reply === "string" && o.reply.trim() ? o.reply.trim() : localFallback(raw).reply;
  return { module, action, params, sensitive, reply };
}

export const orchestrateCommand = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<OrchestratorIntent> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return localFallback(data.text);

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: data.text },
          ],
          response_format: { type: "json_object" },
          temperature: 0.15,
        }),
      });

      if (!res.ok) {
        console.error("Orchestrator gateway error", res.status, await res.text().catch(() => ""));
        return localFallback(data.text);
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content ?? "";
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : null;
      }
      return normalize(parsed, data.text);
    } catch (err) {
      console.error("Orchestrator failure", err);
      return localFallback(data.text);
    }
  });
