import { expect, test } from "vitest";
import { discoveryRegistration } from "./access-policy";

test("unproven phone grants a blank discovery space, never verification or session tokens", () => {
  const result = discoveryRegistration({ firstName: "Kabasele", postNom: "Peter", channel: "phone", phone: "+243810000001", country: "CD" });
  expect(result.access).toBe("discovery");
  expect(result.contactVerified).toBe(false);
  expect(result).not.toHaveProperty("access_token");
  expect(result).not.toHaveProperty("refresh_token");
  expect(result.discovery.filaxId).toMatch(/^FLX-\d{4}-KP$/);
  expect(result.discovery.country).toBe("CD");
});
test("unproven email grants discovery without claiming verification", () => {
  expect(discoveryRegistration({ firstName: "Test", postNom: "Parcours", channel: "email", email: "test@example.com" }).contactVerified).toBe(false);
});
test("a country outside the supported catalog is rejected", () => {
  expect(() => discoveryRegistration({ firstName: "Test", postNom: "Parcours", channel: "email", email: "test@example.com", country: "XX" })).toThrow("pas encore disponible");
});
test("both name and post-name are required", () => {
  expect(() => discoveryRegistration({ firstName: "", postNom: "Parcours", channel: "email", email: "test@example.com" })).toThrow();
  expect(() => discoveryRegistration({ firstName: "Test", postNom: "", channel: "email", email: "test@example.com" })).toThrow();
});
test("invalid email and phone are rejected before any account creation", () => {
  expect(() => discoveryRegistration({ firstName: "Test", postNom: "Parcours", channel: "email", email: "not-an-email" })).toThrow();
  expect(() => discoveryRegistration({ firstName: "Test", postNom: "Parcours", channel: "phone", phone: "123" })).toThrow();
});