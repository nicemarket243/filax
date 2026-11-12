import { describe, expect, test } from "vitest";
import { assertSandboxIntegrity, createSandbox, executeSandbox, settleSandbox } from "./financial-sandbox";

const key = (value: string) => `sandbox-test-${value}`;

 describe("Sandbox financière isolée", () => {
  test("succès : dépôt, retrait et réserve restent mathématiquement séparés", () => {
    let state = createSandbox("USD", 500);
    state = executeSandbox(state, { key: key("deposit"), kind: "deposit", amount: 100, scenario: "success" }).state;
    state = executeSandbox(state, { key: key("withdraw"), kind: "withdraw", amount: 50, scenario: "success" }).state;
    state = executeSandbox(state, { key: key("reserve"), kind: "reserve", amount: 200, scenario: "success" }).state;
    expect(state.available).toBe(35_000);
    expect(state.reserved).toBe(20_000);
    expect(state.journals).toHaveLength(3);
    expect(assertSandboxIntegrity(state)).toBe(true);
  });

  test("attente puis confirmation d'un dépôt", () => {
    let state = createSandbox();
    state = executeSandbox(state, { key: key("pending-deposit"), kind: "deposit", amount: 42.75, scenario: "pending" }).state;
    expect(state.available).toBe(50_000);
    expect(state.pendingIncoming).toBe(4_275);
    state = settleSandbox(state, key("pending-deposit"), "success");
    expect(state.available).toBe(54_275);
    expect(state.pendingIncoming).toBe(0);
    expect(assertSandboxIntegrity(state)).toBe(true);
  });

  test("attente puis annulation d'un retrait : la réserve est intégralement rendue", () => {
    let state = createSandbox();
    state = executeSandbox(state, { key: key("pending-withdraw"), kind: "withdraw", amount: 125, scenario: "pending" }).state;
    expect(state.available).toBe(37_500);
    expect(state.pendingOutgoing).toBe(12_500);
    state = settleSandbox(state, key("pending-withdraw"), "cancelled");
    expect(state.available).toBe(50_000);
    expect(state.pendingOutgoing).toBe(0);
    expect(assertSandboxIntegrity(state)).toBe(true);
  });

  test("refus, annulation et fonds insuffisants ne créent aucun mouvement", () => {
    let state = createSandbox();
    const initial = state;
    state = executeSandbox(state, { key: key("refused"), kind: "deposit", amount: 10, scenario: "refused" }).state;
    state = executeSandbox(state, { key: key("cancelled"), kind: "withdraw", amount: 10, scenario: "cancelled" }).state;
    const insufficient = executeSandbox(state, { key: key("insufficient"), kind: "withdraw", amount: 501, scenario: "success" });
    expect(insufficient.result.status).toBe("refused");
    state = insufficient.state;
    expect(state.available).toBe(initial.available);
    expect(state.reserved).toBe(0);
    expect(state.journals).toHaveLength(0);
  });

  test("une répétition renvoie le premier résultat sans rejouer l'opération", () => {
    let state = createSandbox();
    const request = { key: key("duplicate"), kind: "withdraw" as const, amount: 100, scenario: "success" as const };
    const first = executeSandbox(state, request);
    const second = executeSandbox(first.state, request);
    state = second.state;
    expect(first.result.status).toBe("confirmed");
    expect(second.result.duplicate).toBe(true);
    expect(state.available).toBe(40_000);
    expect(state.journals).toHaveLength(1);
    expect(() => executeSandbox(state, { ...request, amount: 101 })).toThrow("autres paramètres");
  });

  test("rafale de 250 doubles validations : une seule exécution", async () => {
    const initial = createSandbox();
    const request = { key: key("burst"), kind: "reserve" as const, amount: 75, scenario: "success" as const };
    const attempts = await Promise.all(Array.from({ length: 250 }, async () => executeSandbox(initial, request)));
    const state = attempts.at(-1)!.state;
    expect(state.available).toBe(42_500);
    expect(state.reserved).toBe(7_500);
    expect(state.journals).toHaveLength(1);
    expect(assertSandboxIntegrity(state)).toBe(true);
  });

  test("une épargne en attente rejoint la réserve seulement à confirmation", () => {
    let state = createSandbox();
    state = executeSandbox(state, { key: key("pending-reserve"), kind: "reserve", amount: 80, scenario: "pending" }).state;
    expect(state.available).toBe(42_000);
    expect(state.pendingOutgoing).toBe(8_000);
    state = settleSandbox(state, key("pending-reserve"), "success");
    expect(state.reserved).toBe(8_000);
    expect(state.pendingOutgoing).toBe(0);
    expect(assertSandboxIntegrity(state)).toBe(true);
  });

  test("les devises CDF restent en entiers de centimes sans conversion implicite", () => {
    const state = executeSandbox(createSandbox("CDF", 100_000), { key: key("cdf"), kind: "withdraw", amount: 2_300.50, scenario: "success" }).state;
    expect(state.currency).toBe("CDF");
    expect(state.available).toBe(9_769_950);
    expect(assertSandboxIntegrity(state)).toBe(true);
  });
});
