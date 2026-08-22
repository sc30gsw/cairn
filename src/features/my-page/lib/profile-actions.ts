import { Result } from "better-result";

import type {
  ProfileNameInput,
  ProfilePasswordInput,
  ProfileUsernameInput,
} from "~/features/my-page/schemas/profile-schema";
import { authClient } from "~/lib/auth-client";
import { AuthActionError } from "~/lib/errors";

export type ProfileActionResult = { errorMessage: null } | { errorMessage: string };

function toProfileActionResult(result: Result<void, AuthActionError>): ProfileActionResult {
  if (Result.isError(result)) {
    return { errorMessage: result.error.message };
  }
  return { errorMessage: null };
}

function authActionErrorFromUnknown(cause: unknown, fallbackMessage: string): AuthActionError {
  if (cause instanceof AuthActionError) {
    return cause;
  }
  if (cause instanceof Error && cause.message !== "") {
    return new AuthActionError({ cause, message: cause.message });
  }
  return new AuthActionError({ cause, message: fallbackMessage });
}

async function runProfileAction(
  action: () => Promise<void>,
  fallbackMessage: string,
  reloadOnSuccess = true,
): Promise<ProfileActionResult> {
  const result = await Result.tryPromise({
    catch: (cause) => authActionErrorFromUnknown(cause, fallbackMessage),
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
      throw new AuthActionError({
        cause: authResult.error,
        message: authResult.error.message ?? "表示名の更新に失敗しました",
      });
    }
  }, "表示名の更新に失敗しました");
}

export async function updateProfileUsername(
  input: ProfileUsernameInput,
): Promise<ProfileActionResult> {
  return runProfileAction(async () => {
    const authResult = await authClient.updateUser({ username: input.username });
    if (authResult.error) {
      throw new AuthActionError({
        cause: authResult.error,
        message: authResult.error.message ?? "ユーザー名の更新に失敗しました",
      });
    }
  }, "ユーザー名の更新に失敗しました");
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
      throw new AuthActionError({
        cause: authResult.error,
        message: authResult.error.message ?? "パスワードの更新に失敗しました",
      });
    }
  }, "パスワードの更新に失敗しました");
}

export async function updateProfileImage(imageUrl: string): Promise<ProfileActionResult> {
  return runProfileAction(async () => {
    const authResult = await authClient.updateUser({ image: imageUrl });
    if (authResult.error) {
      throw new AuthActionError({
        cause: authResult.error,
        message: authResult.error.message ?? "アイコンの更新に失敗しました",
      });
    }
  }, "アイコンの更新に失敗しました");
}

export async function addPasskey(name?: string): Promise<ProfileActionResult> {
  return runProfileAction(
    async () => {
      const authResult = await authClient.passkey.addPasskey({ name });
      if (authResult.error) {
        throw new AuthActionError({
          cause: authResult.error,
          message: authResult.error.message ?? "パスキーの登録に失敗しました",
        });
      }
    },
    "パスキーの登録に失敗しました",
    false,
  );
}

export async function deletePasskey(id: string): Promise<ProfileActionResult> {
  return runProfileAction(
    async () => {
      const authResult = await authClient.passkey.deletePasskey({ id });
      if (authResult.error) {
        throw new AuthActionError({
          cause: authResult.error,
          message: authResult.error.message ?? "パスキーの削除に失敗しました",
        });
      }
    },
    "パスキーの削除に失敗しました",
    false,
  );
}
