/** Public FILAX site: shared links and QR codes always point here, never to a preview address. */
export const PUBLIC_SITE_ORIGIN = "https://filax.lovable.app";

/**
 * Store pages, filled in once FILAX is published on the App Store / Google Play.
 * While both are null, the QR code opens the FILAX signup page on the public site.
 */
export const STORE_LINKS: { ios: string | null; android: string | null } = { ios: null, android: null };

/** What the QR code opens: a store page when published, otherwise the public signup page. */
export function buildQrTarget(ua = "") {
  if (/iphone|ipad|ipod/i.test(ua) && STORE_LINKS.ios) return STORE_LINKS.ios;
  if (/android/i.test(ua) && STORE_LINKS.android) return STORE_LINKS.android;
  return buildAppInvitationLink(PUBLIC_SITE_ORIGIN);
}

export type DirectShareChannel = "whatsapp" | "facebook" | "x" | "sms";
export type CopyOpenShareChannel = "messenger" | "instagram" | "snapchat";

/** Query flag marking an app-invitation arrival (splash + empty signup). Carries no personal data. */
export const INVITE_PARAM = "invite";

/** The shared app link: the same for everyone, never containing a FILAX ID or any personal data. */
export function buildAppInvitationLink(origin: string) {
  const url = new URL("/", origin);
  url.searchParams.set(INVITE_PARAM, "app");
  return url.toString();
}

/** True for an invitation arrival; old links with ?ref= keep working. */
export function isInvitationArrival(search: string) {
  const params = new URLSearchParams(search);
  return params.has(INVITE_PARAM) || params.has("ref");
}

export function buildDirectShareUrl(channel: DirectShareChannel, link: string, message: string) {
  const text = `${message.trim()} ${link}`.trim();
  if (channel === "whatsapp") return `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (channel === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
  if (channel === "x") return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  return `sms:?&body=${encodeURIComponent(text)}`;
}

/** These services do not provide a reliable prefilled web-share URL: copy first, then open them. */
export const COPY_OPEN_DESTINATIONS: Record<CopyOpenShareChannel, string> = {
  messenger: "https://www.messenger.com/new",
  instagram: "https://www.instagram.com/",
  snapchat: "https://www.snapchat.com/",
};
