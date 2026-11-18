import { expect, test } from "vitest";
import { DISCOVERY_ACCOUNTS, discoveryProfile } from "./discovery-data";

test("un nouvel espace possède seulement USD et CDF avec tous les montants à zéro", () => {
  expect(DISCOVERY_ACCOUNTS.map((account) => account.currency)).toEqual(["USD", "CDF"]);
  for (const account of DISCOVERY_ACCOUNTS) {
    expect(account.balance).toBe(0);
    expect(account.availableBalance).toBe(0);
    expect(account.reservedBalance).toBe(0);
    expect(account.pendingIncoming).toBe(0);
    expect(account.pendingOutgoing).toBe(0);
  }
});

test("le profil invité ne reprend ni identité ni photo du compte vitrine", () => {
  const profile = discoveryProfile({ name: "Kabasele Peter", nom: "Kabasele", prenom: "Peter", phone: "+243810000000", filaxId: "FLX-0001-KP", country: "CD" });
  expect(profile).toMatchObject({ firstName: "Peter", lastName: "Kabasele", filaxId: "FLX-0001-KP", photo: null, verified: false });
});
