import { expect, test } from "vitest";
import { AVATAR_MAX_BYTES, avatarFileError } from "./profile-avatar";

test("les photos JPG, PNG et WebP jusqu'à 5 Mo sont acceptées", () => {
  expect(avatarFileError({ type: "image/jpeg", size: AVATAR_MAX_BYTES })).toBeNull();
  expect(avatarFileError({ type: "image/png", size: 1000 })).toBeNull();
  expect(avatarFileError({ type: "image/webp", size: 1000 })).toBeNull();
});

test("les fichiers non image, vides ou trop lourds sont refusés", () => {
  expect(avatarFileError({ type: "application/pdf", size: 1000 })).toMatch(/JPG/);
  expect(avatarFileError({ type: "image/jpeg", size: 0 })).toMatch(/vide/);
  expect(avatarFileError({ type: "image/jpeg", size: AVATAR_MAX_BYTES + 1 })).toMatch(/5 Mo/);
});
