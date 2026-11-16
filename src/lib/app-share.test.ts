import { describe, expect, test } from "vitest";
import { buildAppInvitationLink, buildDirectShareUrl, buildQrTarget, COPY_OPEN_DESTINATIONS, isInvitationArrival, PUBLIC_SITE_ORIGIN } from "./app-share";

describe("FILAX app invitations", () => {
  test("the shared app link points to the public FILAX home", () => {
    const url = new URL(buildAppInvitationLink(PUBLIC_SITE_ORIGIN));
    expect(url.origin).toBe("https://filax.lovable.app");
    expect(url.pathname).toBe("/");
  });

  test("the shared app link never contains a FILAX ID", () => {
    const link = buildAppInvitationLink(PUBLIC_SITE_ORIGIN);
    expect(link).not.toMatch(/FLX/i);
    expect(new URL(link).searchParams.has("ref")).toBe(false);
  });

  test("everyone shares exactly the same app link", () => {
    expect(buildAppInvitationLink(PUBLIC_SITE_ORIGIN)).toBe(buildAppInvitationLink(PUBLIC_SITE_ORIGIN));
  });

  test("the shared link is recognised as an invitation arrival, and old ?ref links still are", () => {
    expect(isInvitationArrival(new URL(buildAppInvitationLink(PUBLIC_SITE_ORIGIN)).search)).toBe(true);
    expect(isInvitationArrival("?ref=FLX-8241-KB")).toBe(true);
    expect(isInvitationArrival("")).toBe(false);
  });

  test("WhatsApp, X and SMS carry both the invitation message and link", () => {
    const link = buildAppInvitationLink(PUBLIC_SITE_ORIGIN);
    for (const channel of ["whatsapp", "x", "sms"] as const) {
      const target = buildDirectShareUrl(channel, link, "Rejoignez-moi sur FILAX");
      expect(decodeURIComponent(target)).toContain("Rejoignez-moi sur FILAX");
      expect(decodeURIComponent(target)).toContain(link);
    }
  });

  test("Facebook shares the invitation URL", () => {
    const link = buildAppInvitationLink(PUBLIC_SITE_ORIGIN);
    const target = new URL(buildDirectShareUrl("facebook", link, "Rejoignez-moi sur FILAX"));
    expect(target.hostname).toBe("www.facebook.com");
    expect(target.searchParams.get("u")).toBe(link);
  });

  test("copy-first channels have explicit HTTPS destinations", () => {
    expect(Object.keys(COPY_OPEN_DESTINATIONS).sort()).toEqual(["instagram", "messenger", "snapchat"]);
    for (const destination of Object.values(COPY_OPEN_DESTINATIONS)) expect(new URL(destination).protocol).toBe("https:");
  });

  test("the QR code opens the public signup link while no store link exists", () => {
    expect(buildQrTarget("iPhone")).toBe(buildAppInvitationLink(PUBLIC_SITE_ORIGIN));
  });
});
