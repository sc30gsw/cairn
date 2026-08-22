import type { Passkey } from "@better-auth/passkey/client";
import { Result } from "better-result";

import { authClient } from "~/lib/auth-client";
import { type AuthErrorContext, presentAuthError } from "~/lib/auth-error-messages";
import { AuthActionError } from "~/lib/errors";
import type { PasskeyAddInput } from "~/lib/validation/passkey-schema";
import type {
  ProfileNameInput,
  ProfilePasswordInput,
  ProfileUsernameInput,
} from "~/lib/validation/profile-schema";

export type ProfileActionResult = { errorMessage: null } | { errorMessage: string };

export type PasskeyListResult =
  | { errorMessage: null; passkeys: Passkey[] }
  | { errorMessage: string; passkeys: Passkey[] };

function toProfileActionResult(result: Result<void, AuthActionError>): ProfileActionResult {
  if (Result.isError(result)) {
    return { errorMessage: result.error.message };
  }
  return { errorMessage: null };
}

function authActionError(error: unknown, context: AuthErrorContext): AuthActionError {
  return new AuthActionError({ cause: error, message: presentAuthError(error, context) });
}

function authActionErrorFromUnknown(cause: unknown, context: AuthErrorContext): AuthActionError {
  if (cause instanceof AuthActionError) {
    return cause;
  }
  return authActionError(cause, context);
}

async function runProfileAction(
  action: () => Promise<void>,
  context: AuthErrorContext,
  reloadOnSuccess = true,
): Promise<ProfileActionResult> {
  const result = await Result.tryPromise({
    catch: (cause) => authActionErrorFromUnknown(cause, context),
    try: action,
  });
  if (Result.isOk(result) && reloadOnSuccess) {
    location.reload();
  }
  return toProfileActionResult(result);
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

export async function updateProfileImage(imageUrl: string): Promise<ProfileActionResult> {
  return runProfileAction(async () => {
    const authResult = await authClient.updateUser({ image: imageUrl });
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
  const result = await authClient.passkey.listUserPasskeys();
  if (result.error) {
    return {
      errorMessage: presentAuthError(result.error, "listPasskeys"),
      passkeys: [],
    };
  }
  return { errorMessage: null, passkeys: result.data ?? [] };
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
