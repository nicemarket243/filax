export type DirectShareChannel = "whatsapp" | "facebook" | "x" | "sms";
export type CopyOpenShareChannel = "messenger" | "instagram" | "snapchat";

/** A personal invitation points to FILAX home, which shows simplified signup to signed-out visitors. */
export function buildAppInvitationLink(origin: string, filaxId: string) {
  const url = new URL("/", origin);
  const referral = filaxId.trim();
  if (referral) url.searchParams.set("ref", referral);
  return url.toString();
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
