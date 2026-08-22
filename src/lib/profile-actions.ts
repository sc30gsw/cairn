import type { Passkey } from "@better-auth/passkey/client";
import { Result } from "better-result";

import { authClient } from "~/lib/auth-client";
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

export async function addPasskey(input: PasskeyAddInput): Promise<ProfileActionResult> {
  return runProfileAction(
    async () => {
      const authResult = await authClient.passkey.addPasskey({ name: input.name });
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

export async function listPasskeys(): Promise<PasskeyListResult> {
  const result = await authClient.passkey.listUserPasskeys();
  if (result.error) {
    return {
      errorMessage: result.error.message ?? "パスキー一覧の取得に失敗しました",
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
