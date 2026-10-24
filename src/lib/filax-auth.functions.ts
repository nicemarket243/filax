import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { detectIdentifier, normalizePhone } from "@/lib/identifier";

/** Domaine interne des comptes créés avec un numéro seul : jamais utilisé pour envoyer un e-mail. */
const PHONE_ONLY_DOMAIN = "@filax-phone.local";

function publicClient() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

function mask(c: { email?: string; phone?: string }) {
  if (c.email) {
    const [u, d] = c.email.split("@");
    return `${u.slice(0, 2)}•••@${d}`;
  }
  return `•••${c.phone!.slice(-3)}`;
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

/**
 * Inscription directe : nom, post-nom et téléphone OU e-mail. Aucun code à cette étape —
 * le compte est créé confirmé, l'ID FILAX et les comptes principaux sont générés par le
 * déclencheur handle_new_user, et la session est renvoyée pour une entrée immédiate.
 * La connexion ultérieure exige toujours le code à 6 chiffres : le compte reste protégé.
 */
export const registerFilaxAccount = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        firstName: z.string().trim().min(2).max(80),
        postNom: z.string().trim().min(2).max(80),
        channel: z.enum(["email", "phone"]),
        email: z.string().trim().max(255).optional(),
        phone: z.string().trim().max(24).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.channel === "email" ? data.email?.trim().toLowerCase() : undefined;
    const phone = data.channel === "phone" ? normalizePhone(data.phone ?? "") ?? undefined : undefined;
    if (data.channel === "email" && !email) return { ok: false as const, error: "Entrez une adresse e-mail valide" };
    if (data.channel === "phone" && !phone) return { ok: false as const, error: "Entrez un numéro de téléphone valide" };

    if (email) {
      const { data: existing } = await supabaseAdmin.from("profiles").select("user_id").ilike("email", email).maybeSingle();
      if (existing) return { ok: false as const, error: "Un compte existe déjà avec cet e-mail. Connectez-vous." };
    }
    if (phone) {
      const { data: existing } = await supabaseAdmin.from("profiles").select("user_id").in("phone", [phone, phone.slice(1)]).maybeSingle();
      if (existing) return { ok: false as const, error: "Un compte existe déjà avec ce numéro. Connectez-vous." };
    }

    const authEmail = email ?? `p${phone!.replace(/\D/g, "")}${PHONE_ONLY_DOMAIN}`;
    const password = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      phone,
      phone_confirm: Boolean(phone),
      user_metadata: {
        first_name: data.firstName,
        middle_name: data.postNom,
        phone: phone ?? null,
        contact_email: email ?? null,
      },
    });
    if (createError || !created.user) {
      const dup = /already|duplicate|unique|registered/i.test(createError?.message ?? "");
      return { ok: false as const, error: dup ? "Un compte existe déjà avec ces informations. Connectez-vous." : "Inscription impossible pour le moment" };
    }

    const sb = publicClient();
    const { data: session, error: signInError } = await sb.auth.signInWithPassword({ email: authEmail, password });
    if (signInError || !session.session) {
      return { ok: false as const, error: "Compte créé. Connectez-vous avec votre identifiant." };
    }
    const { data: profile } = await supabaseAdmin.from("profiles").select("filax_id").eq("user_id", created.user.id).maybeSingle();
    return {
      ok: true as const,
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      filaxId: profile?.filax_id ?? null,
    };
  });

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
      .object({ identifier: z.string().trim().min(3).max(255), channel: z.enum(["email", "sms"]), token: z.string().regex(/^\d{6,8}$/) })
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

/**
 * Connexion Google en mode « Connexion » : si l'adresse Gmail choisie ne correspond à aucun
 * compte FILAX existant, le compte vide qui vient d'être créé automatiquement est supprimé,
 * pour ne jamais basculer sur un profil vide à 0 $.
 */
export const discardFreshGoogleAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const user = data?.user;
    if (!user) return { discarded: false as const };
    const ageMs = Date.now() - new Date(user.created_at).getTime();
    if (ageMs > 10 * 60 * 1000) return { discarded: false as const, email: user.email ?? null };
    const [{ data: accts }, { count: txCount }, { count: groupCount }] = await Promise.all([
      supabaseAdmin.from("accounts").select("balance").eq("user_id", context.userId),
      supabaseAdmin.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", context.userId),
      supabaseAdmin.from("groups").select("id", { count: "exact", head: true }).eq("owner_id", context.userId),
    ]);
    const empty = (accts ?? []).every((a) => Number(a.balance) === 0) && !txCount && !groupCount;
    if (!empty) return { discarded: false as const, email: user.email ?? null };
    await supabaseAdmin.from("accounts").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("notifications").delete().eq("user_id", context.userId);
    await supabaseAdmin.from("profiles").delete().eq("user_id", context.userId);
    await supabaseAdmin.auth.admin.deleteUser(context.userId);
    return { discarded: true as const, email: user.email ?? null };
  });
