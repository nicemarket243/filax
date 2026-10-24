import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { detectIdentifier, normalizePhone } from "@/lib/identifier";
import { discoveryRegistration, registrationInput } from "@/lib/access-policy";

/** Domaine interne des comptes créés avec un numéro seul : jamais utilisé pour envoyer un e-mail. */
const PHONE_ONLY_DOMAIN = "@filax-phone.local";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
}

function mask(c: { email?: string; phone?: string }) {
  if (c.email) {
    const [u, d] = c.email.split("@");
    return `${u.slice(0, 2)}•••@${d}`;
  }
  return `•••${c.phone?.slice(-3) ?? ""}`;
}

type Contact = { email?: string; phone?: string };

/** Résout un identifiant (e-mail, ID FILAX ou téléphone) vers le contact réel du compte. */
async function resolveLoginContact(identifier: string): Promise<Contact | null> {
  const type = detectIdentifier(identifier);
  if (!type) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let userId: string | null = null;
  if (type === "filax") {
    const { data: p } = await supabaseAdmin.from("profiles").select("user_id").ilike("filax_id", identifier.trim()).maybeSingle();
    userId = p?.user_id ?? null;
  } else if (type === "email") {
    const { data: p } = await supabaseAdmin.from("profiles").select("user_id").ilike("email", identifier.trim()).maybeSingle();
    userId = p?.user_id ?? null;
  } else {
    const phone = normalizePhone(identifier);
    if (!phone) return null;
    const { data: p } = await supabaseAdmin.from("profiles").select("user_id").in("phone", [phone, phone.slice(1)]).maybeSingle();
    userId = p?.user_id ?? null;
  }
  if (!userId) return null;
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const user = data?.user;
  if (!user) return null;
  const email = user.email && !user.email.endsWith(PHONE_ONLY_DOMAIN) ? user.email : undefined;
  const phone = user.phone ? (user.phone.startsWith("+") ? user.phone : `+${user.phone}`) : undefined;
  return { email, phone };
}

/** Quick access is discovery only until contact ownership is proven. */
export const registerFilaxAccount = createServerFn({ method: "POST" })
  .inputValidator((d) => registrationInput.parse(d))
  .handler(async ({ data }) => discoveryRegistration(data));

/** Liste les canaux par lesquels un identifiant peut recevoir son code à 6 chiffres. */
export const resolveLoginChannels = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ identifier: z.string().trim().min(3).max(255) }).parse(d))
  .handler(async ({ data }) => {
    const contact = await resolveLoginContact(data.identifier);
    if (!contact) return { ok: false as const, error: "Aucun compte ne correspond à cet identifiant" };
    const channels: { channel: "email" | "sms"; masked: string; available: boolean }[] = [];
    if (contact.email) channels.push({ channel: "email", masked: mask({ email: contact.email }), available: true });
    if (contact.phone) {
      // Le prestataire SMS n'est pas encore configuré : le canal est affiché mais indisponible.
      channels.push({ channel: "sms", masked: mask({ phone: contact.phone }), available: false });
    }
    if (!channels.length) return { ok: false as const, error: "Aucun canal de connexion disponible pour ce compte" };
    return { ok: true as const, channels };
  });

/** Envoie le code à 6 chiffres sur le canal choisi. */
export const sendLoginCode = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ identifier: z.string().trim().min(3).max(255), channel: z.enum(["email", "sms"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const contact = await resolveLoginContact(data.identifier);
    if (!contact) return { ok: false as const, error: "Aucun compte ne correspond à cet identifiant" };
    if (data.channel === "sms") {
      return { ok: false as const, error: "Les codes SMS ne sont pas encore disponibles. Utilisez l'e-mail." };
    }
    if (!contact.email) return { ok: false as const, error: "Aucun e-mail n'est lié à ce compte" };
    const sb = publicClient();
    const { error } = await sb.auth.signInWithOtp({ email: contact.email, options: { shouldCreateUser: false } });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, masked: mask({ email: contact.email }) };
  });

/** Vérifie le code et renvoie la session à installer côté navigateur. */
export const verifyLoginCode = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ identifier: z.string().trim().min(3).max(255), channel: z.enum(["email", "sms"]), token: z.string().regex(/^\d{6}$/) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const contact = await resolveLoginContact(data.identifier);
    if (!contact) return { ok: false as const, error: "Aucun compte ne correspond à cet identifiant" };
    const sb = publicClient();
    const { data: res, error } =
      data.channel === "email" && contact.email
        ? await sb.auth.verifyOtp({ email: contact.email, token: data.token, type: "email" })
        : contact.phone
          ? await sb.auth.verifyOtp({ phone: contact.phone, token: data.token, type: "sms" })
          : { data: { session: null }, error: new Error("canal indisponible") };
    if (error || !res.session) return { ok: false as const, error: "Code invalide ou expiré" };
    return { ok: true as const, access_token: res.session.access_token, refresh_token: res.session.refresh_token };
  });

/** Deprecated compatibility endpoint: accounts must never be automatically deleted. */
export const discardFreshGoogleAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ discarded: false as const, email: null }));
