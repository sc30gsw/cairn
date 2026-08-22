import * as v from "valibot";
import { expect, test } from "vite-plus/test";

import { displayNameField, passwordField, usernameField } from "~/lib/validation/account-fields";

test("usernameField は英数字とアンダースコアのみ許可する", () => {
  expect(v.safeParse(usernameField, "valid_user1").success).toBe(true);
  expect(v.safeParse(usernameField, "bad-user").success).toBe(false);
  expect(v.safeParse(usernameField, "ab").success).toBe(false);
});

test("displayNameField は空文字を拒否する", () => {
  expect(v.safeParse(displayNameField, "").success).toBe(false);
  expect(v.safeParse(displayNameField, "Owner").success).toBe(true);
});

test("passwordField は8文字未満を拒否する", () => {
  expect(v.safeParse(passwordField, "short").success).toBe(false);
  expect(v.safeParse(passwordField, "longenough").success).toBe(true);
});
