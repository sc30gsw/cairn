import * as v from "valibot";

import {
  currentPasswordField,
  displayNameField,
  newPasswordField,
  usernameField,
} from "~/lib/validation/account-fields";

export const ProfileNameSchema = v.object({
  name: displayNameField,
});

export const ProfileUsernameSchema = v.object({
  username: usernameField,
});

export const ProfilePasswordSchema = v.object({
  currentPassword: currentPasswordField,
  newPassword: newPasswordField,
});

export type ProfileNameInput = v.InferOutput<typeof ProfileNameSchema>;
export type ProfileUsernameInput = v.InferOutput<typeof ProfileUsernameSchema>;
export type ProfilePasswordInput = v.InferOutput<typeof ProfilePasswordSchema>;
