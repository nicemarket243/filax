import { expect, test } from "vitest";
import { discoveryRegistration } from "./access-policy";

test("unproven phone grants discovery, never verification or session tokens", () => {
  const result = discoveryRegistration({ firstName: "Test", postNom: "Parcours", channel: "phone", phone: "+243810000001" });
  expect(result.access).toBe("discovery");
  expect(result.contactVerified).toBe(false);
  expect(result).not.toHaveProperty("access_token");
  expect(result).not.toHaveProperty("refresh_token");
});
test("unproven email grants discovery without claiming verification", () => {
  expect(discoveryRegistration({ firstName: "Test", postNom: "Parcours", channel: "email", email: "test@example.com" }).contactVerified).toBe(false);
});
test("both name and post-name are required", () => {
  expect(() => discoveryRegistration({ firstName: "", postNom: "Parcours", channel: "email", email: "test@example.com" })).toThrow();
  expect(() => discoveryRegistration({ firstName: "Test", postNom: "", channel: "email", email: "test@example.com" })).toThrow();
});
test("invalid email and phone are rejected before any account creation", () => {
  expect(() => discoveryRegistration({ firstName: "Test", postNom: "Parcours", channel: "email", email: "not-an-email" })).toThrow();
  expect(() => discoveryRegistration({ firstName: "Test", postNom: "Parcours", channel: "phone", phone: "123" })).toThrow();
});