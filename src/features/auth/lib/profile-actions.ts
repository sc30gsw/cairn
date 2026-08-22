import type { Passkey } from "@better-auth/passkey/client";
import { Result } from "better-result";

import type { Id } from "~/../convex/_generated/dataModel";
import type { AuthActionResult } from "~/lib/auth-action-result";
import { authClient } from "~/lib/auth-client";
import { type AuthErrorContext, presentAuthError } from "~/lib/auth-error-messages";
import { AuthActionError } from "~/lib/errors";
import type { PasskeyAddInput } from "~/lib/validation/passkey-schema";
import type {
  ProfileNameInput,
  ProfilePasswordInput,
  ProfileUsernameInput,
} from "~/lib/validation/profile-schema";

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
  refreshSessionOnSuccess = true,
): Promise<AuthActionResult> {
  const result = await Result.tryPromise({
    catch: (cause) => authActionErrorFromUnknown(cause, context),
    try: action,
  });
  if (Result.isOk(result) && refreshSessionOnSuccess) {
    await authClient.getSession();
  }
  return result;
}

export async function updateProfileName(input: ProfileNameInput): Promise<AuthActionResult> {
  return runProfileAction(async () => {
    const authResult = await authClient.updateUser({ name: input.name });
    if (authResult.error) {
      throw authActionError(authResult.error, "updateName");
    }
  }, "updateName");
}

export async function updateProfileUsername(
  input: ProfileUsernameInput,
): Promise<AuthActionResult> {
  return runProfileAction(async () => {
    const authResult = await authClient.updateUser({ username: input.username });
    if (authResult.error) {
      throw authActionError(authResult.error, "updateUsername");
    }
  }, "updateUsername");
}

export async function updateProfilePassword(
  input: ProfilePasswordInput,
): Promise<AuthActionResult> {
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

export async function updateProfileImage(
  storageId: Id<"_storage">,
  resolveAvatarUrl: (storageId: Id<"_storage">) => Promise<string>,
): Promise<AuthActionResult> {
  return runProfileAction(async () => {
    const imageUrl = await resolveAvatarUrl(storageId);
    const authResult = await authClient.updateUser({ image: imageUrl });
    if (authResult.error) {
      throw authActionError(authResult.error, "updateImage");
    }
  }, "updateImage");
}

export async function addPasskey(input: PasskeyAddInput): Promise<AuthActionResult> {
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

export async function listPasskeys(): Promise<Result<Passkey[], AuthActionError>> {
  const result = await authClient.passkey.listUserPasskeys();
  if (result.error) {
    return Result.err(authActionError(result.error, "listPasskeys"));
  }
  return Result.ok(result.data ?? []);
}

export async function deletePasskey(id: string): Promise<AuthActionResult> {
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
