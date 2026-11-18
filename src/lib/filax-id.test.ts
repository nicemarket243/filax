import { expect, test } from "vitest";
import { discoveryFilaxId, filaxInitials } from "./filax-id";

test("l'ID contient quatre chiffres puis les initiales du nom et du prénom", () => {
  expect(discoveryFilaxId("Kabasele", "Peter", () => 0.8241)).toBe("FLX-8241-KP");
});

test("les initiales sont normalisées et restent deux lettres ASCII", () => {
  expect(filaxInitials("Élonga", "Àline")).toBe("EA");
  expect(filaxInitials("", "")).toBe("XX");
});

test("les quatre chiffres conservent les zéros initiaux", () => {
  expect(discoveryFilaxId("Mukendi", "Alvine", () => 0.0007)).toBe("FLX-0007-MA");
});
