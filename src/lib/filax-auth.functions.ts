import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const idSchema = z.string().trim().toUpperCase().regex(/^FLX[-A-Z0-9]{3,32}$/);

function publicClient() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

async function resolveContact(filaxId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .ilike("filax_id", filaxId)
    .maybeSingle();
  if (!profile) return null;
  const { data } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
  const user = data?.user;
  if (user?.email) return { email: user.email } as const;
  if (user?.phone) return { phone: user.phone.startsWith("+") ? user.phone : `+${user.phone}` } as const;
  return null;
}

function mask(c: { email?: string; phone?: string }) {
  if (c.email) {
    const [u, d] = c.email.split("@");
    return `${u.slice(0, 2)}•••@${d}`;
  }
  return `•••${c.phone!.slice(-3)}`;
}

/** Envoie un code de connexion au contact (e-mail ou SMS) lié à un ID FILAX. */
export const sendFilaxIdCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ filaxId: idSchema }).parse(d))
  .handler(async ({ data }) => {
    const contact = await resolveContact(data.filaxId);
    if (!contact) return { ok: false as const, error: "ID FILAX introuvable" };
    const sb = publicClient();
    const { error } = contact.email
      ? await sb.auth.signInWithOtp({ email: contact.email, options: { shouldCreateUser: false } })
      : await sb.auth.signInWithOtp({ phone: contact.phone!, options: { shouldCreateUser: false } });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, channel: contact.email ? "email" : "sms", masked: mask(contact) };
  });

/** Vérifie le code et renvoie la session à installer côté navigateur. */
export const verifyFilaxIdCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ filaxId: idSchema, token: z.string().regex(/^\d{6,8}$/) }).parse(d))
  .handler(async ({ data }) => {
    const contact = await resolveContact(data.filaxId);
    if (!contact) return { ok: false as const, error: "ID FILAX introuvable" };
    const sb = publicClient();
    const { data: res, error } = contact.email
      ? await sb.auth.verifyOtp({ email: contact.email, token: data.token, type: "email" })
      : await sb.auth.verifyOtp({ phone: contact.phone!, token: data.token, type: "sms" });
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
