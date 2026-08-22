import type { Passkey } from "@better-auth/passkey/client";
import { Result } from "better-result";

import type { Id } from "~/../convex/_generated/dataModel";
import { authClient } from "~/lib/auth-client";
import { encodeAvatarStorageRef } from "~/lib/avatar-image";
import {
  authActionError,
  authActionErrorFromUnknown,
  runAuthAction,
  type ActionResult,
} from "~/lib/run-auth-action";
import type { PasskeyAddInput } from "~/lib/validation/passkey-schema";
import type {
  ProfileNameInput,
  ProfilePasswordInput,
  ProfileUsernameInput,
} from "~/lib/validation/profile-schema";

export type ProfileActionResult = ActionResult;

export type PasskeyListResult =
  | { errorMessage: null; passkeys: Passkey[] }
  | { errorMessage: string; passkeys: Passkey[] };

async function runProfileAction(
  action: () => Promise<void>,
  context: Parameters<typeof runAuthAction>[1],
  refreshSessionOnSuccess = true,
): Promise<ProfileActionResult> {
  return runAuthAction(
    action,
    context,
    refreshSessionOnSuccess
      ? async () => {
          await authClient.getSession();
        }
      : undefined,
  );
}

export async function updateProfileName(input: ProfileNameInput): Promise<ProfileActionResult> {
  return runProfileAction(async () => {
    const authResult = await authClient.updateUser({ name: input.name });
    if (authResult.error) {
      throw authActionError(authResult.error, "updateName");
    }
  }, "updateName");
}

export async function updateProfileUsername(
  input: ProfileUsernameInput,
): Promise<ProfileActionResult> {
  return runProfileAction(async () => {
    const authResult = await authClient.updateUser({ username: input.username });
    if (authResult.error) {
      throw authActionError(authResult.error, "updateUsername");
    }
  }, "updateUsername");
}

export async function updateProfilePassword(
  input: ProfilePasswordInput,
): Promise<ProfileActionResult> {
  return runProfileAction(async () => {
    const authResult = await authClient.changePassword({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });
    if (authResult.error) {
      throw authActionError(authResult.error, "changePassword");
    }
  }, "changePassword");
}

export async function updateProfileImage(storageId: Id<"_storage">): Promise<ProfileActionResult> {
  return runProfileAction(async () => {
    const authResult = await authClient.updateUser({
      image: encodeAvatarStorageRef(storageId),
    });
    if (authResult.error) {
      throw authActionError(authResult.error, "updateImage");
    }
  }, "updateImage");
}

export async function addPasskey(input: PasskeyAddInput): Promise<ProfileActionResult> {
  return runProfileAction(
    async () => {
      const authResult = await authClient.passkey.addPasskey({ name: input.name });
      if (authResult.error) {
        throw authActionError(authResult.error, "addPasskey");
      }
    },
    "addPasskey",
    false,
  );
}

export async function listPasskeys(): Promise<PasskeyListResult> {
  const result = await Result.tryPromise({
    catch: (cause) => authActionErrorFromUnknown(cause, "listPasskeys"),
    try: async () => {
      const authResult = await authClient.passkey.listUserPasskeys();
      if (authResult.error) {
        throw authActionError(authResult.error, "listPasskeys");
      }
      return authResult.data ?? [];
    },
  });
  if (Result.isError(result)) {
    return { errorMessage: result.error.message, passkeys: [] };
  }
  return { errorMessage: null, passkeys: result.value };
}

export async function deletePasskey(id: string): Promise<ProfileActionResult> {
  return runProfileAction(
    async () => {
      const authResult = await authClient.passkey.deletePasskey({ id });
      if (authResult.error) {
        throw authActionError(authResult.error, "deletePasskey");
      }
    },
    "deletePasskey",
    false,
  );
}
