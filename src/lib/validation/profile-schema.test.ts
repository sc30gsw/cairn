import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { displayNameField, passwordField, usernameField } from "~/lib/validation/account-fields";
import {
  ProfileNameSchema,
  ProfilePasswordSchema,
  ProfileUsernameSchema,
} from "~/lib/validation/profile-schema";

test("profile schemas accept the same valid values as auth signup fields", () => {
  expect(v.safeParse(ProfileNameSchema, { name: "Owner" }).success).toBe(true);
  expect(v.safeParse(ProfileUsernameSchema, { username: "owner_user" }).success).toBe(true);
  expect(
    v.safeParse(ProfilePasswordSchema, {
      currentPassword: "old-password",
      newPassword: "new-password",
    }).success,
  ).toBe(true);
});

test("profile schemas reject invalid shared field values", () => {
  expect(v.safeParse(ProfileNameSchema, { name: "" }).success).toBe(false);
  expect(v.safeParse(ProfileUsernameSchema, { username: "ab" }).success).toBe(false);
  expect(v.safeParse(displayNameField, "").success).toBe(false);
  expect(v.safeParse(usernameField, "ab").success).toBe(false);
  expect(v.safeParse(passwordField, "short").success).toBe(false);
});
