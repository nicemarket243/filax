import { describe, expect, test } from "vitest";
import { buildAppInvitationLink, buildDirectShareUrl, COPY_OPEN_DESTINATIONS } from "./app-share";

describe("FILAX app invitations", () => {
  test("the invitation points to home with the inviter's FILAX ID", () => {
    const url = new URL(buildAppInvitationLink("https://filax.lovable.app", "FLX-8241-KB"));
    expect(url.origin).toBe("https://filax.lovable.app");
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("ref")).toBe("FLX-8241-KB");
  });

  test("two members receive different invitation links", () => {
    const first = buildAppInvitationLink("https://filax.lovable.app", "FLX-1111-AA");
    const second = buildAppInvitationLink("https://filax.lovable.app", "FLX-2222-BB");
    expect(first).not.toBe(second);
  });

  test("an unusual ID stays inside the ref query parameter", () => {
    const url = new URL(buildAppInvitationLink("https://filax.lovable.app", "ID & next=/admin"));
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("ref")).toBe("ID & next=/admin");
    expect(url.searchParams.has("next")).toBe(false);
  });

  test("WhatsApp, X and SMS carry both the invitation message and link", () => {
    const link = buildAppInvitationLink("https://filax.lovable.app", "FLX-8241-KB");
    for (const channel of ["whatsapp", "x", "sms"] as const) {
      const target = buildDirectShareUrl(channel, link, "Rejoignez-moi sur FILAX");
      expect(decodeURIComponent(target)).toContain("Rejoignez-moi sur FILAX");
      expect(decodeURIComponent(target)).toContain(link);
    }
  });

  test("Facebook shares the invitation URL", () => {
    const link = buildAppInvitationLink("https://filax.lovable.app", "FLX-8241-KB");
    const target = new URL(buildDirectShareUrl("facebook", link, "Rejoignez-moi sur FILAX"));
    expect(target.hostname).toBe("www.facebook.com");
    expect(target.searchParams.get("u")).toBe(link);
  });

  test("copy-first channels have explicit HTTPS destinations", () => {
    expect(Object.keys(COPY_OPEN_DESTINATIONS).sort()).toEqual(["instagram", "messenger", "snapchat"]);
    for (const destination of Object.values(COPY_OPEN_DESTINATIONS)) {
      expect(new URL(destination).protocol).toBe("https:");
    }
  });
});

import { buildQrTarget, PUBLIC_SITE_ORIGIN } from "./app-share";
import { describe as d2, expect as e2, it as i2 } from "vitest";
d2("QR target", () => {
  i2("opens the public FILAX signup page while no store link exists", () => {
    e2(buildQrTarget("FLX-1", "iPhone")).toBe(`${PUBLIC_SITE_ORIGIN}/?ref=FLX-1`);
  });
});
