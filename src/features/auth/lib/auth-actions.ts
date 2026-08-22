import { Result } from "better-result";

import type {
  AccountLoginInput,
  AccountSignUpInput,
} from "~/features/auth/schemas/account-auth-schema";
import { isEmailAddress } from "~/features/auth/schemas/account-auth-schema";
import { authClient } from "~/lib/auth-client";
import { AuthActionError } from "~/lib/errors";
import { PASSKEY_SIGNUP_PROMPT_KEY, writePasskeyFlag } from "~/lib/passkey-storage";

function reloadAfterAuth() {
  location.reload();
}

export type AuthActionResult = { errorMessage: null } | { errorMessage: string };

function toAuthActionResult(result: Result<void, AuthActionError>): AuthActionResult {
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

async function runAuthAction(
  action: () => Promise<void>,
  fallbackMessage: string,
): Promise<AuthActionResult> {
  const result = await Result.tryPromise({
    catch: (cause) => authActionErrorFromUnknown(cause, fallbackMessage),
    try: action,
  });
  if (Result.isOk(result)) {
    reloadAfterAuth();
  }
  return toAuthActionResult(result);
}

export async function signInWithAccount(input: AccountLoginInput): Promise<AuthActionResult> {
  return runAuthAction(async () => {
    const authResult = isEmailAddress(input.identifier)
      ? await authClient.signIn.email({ email: input.identifier, password: input.password })
      : await authClient.signIn.username({ username: input.identifier, password: input.password });

    if (authResult.error) {
      throw new AuthActionError({
        cause: authResult.error,
        message: authResult.error.message ?? "ログインに失敗しました",
      });
    }
  }, "ログインに失敗しました");
}

export async function signUpWithAccount(input: AccountSignUpInput): Promise<AuthActionResult> {
  return runAuthAction(async () => {
    const authResult = await authClient.signUp.email({
      email: input.email,
      name: input.name,
      password: input.password,
      username: input.username,
    });

    if (authResult.error) {
      throw new AuthActionError({
        cause: authResult.error,
        message: authResult.error.message ?? "登録に失敗しました",
      });
    }
    writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);
  }, "登録に失敗しました");
}

export async function signInWithPasskey(): Promise<AuthActionResult> {
  return runAuthAction(async () => {
    const authResult = await authClient.signIn.passkey();
    if (authResult.error) {
      throw new AuthActionError({
        cause: authResult.error,
        message: authResult.error.message ?? "パスキーでのログインに失敗しました",
      });
    }
  }, "パスキーでのログインに失敗しました");
}

export function signInWithNotion() {
  void authClient.signIn.social({ provider: "notion" });
}

export function signOutAndReload() {
  void authClient.signOut({
    fetchOptions: {
      onSuccess: reloadAfterAuth,
    },
  });
}
