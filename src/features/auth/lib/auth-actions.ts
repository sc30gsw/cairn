import { Result } from "better-result";

import type {
  AccountLoginInput,
  AccountSignUpInput,
} from "~/features/auth/schemas/account-auth-schema";
import { isEmailAddress } from "~/features/auth/schemas/account-auth-schema";
import { type AuthActionResult, runAuthAction } from "~/lib/auth-action-result";
import { authClient } from "~/lib/auth-client";
import { AuthActionError } from "~/lib/errors";
import {
  PASSKEY_OAUTH_PENDING_KEY,
  PASSKEY_SIGNUP_PROMPT_KEY,
  writePasskeyFlag,
  writePasskeySessionFlag,
} from "~/lib/passkey-storage";
import { authActionError } from "~/lib/run-auth-action";

function reloadAfterAuth() {
  location.reload();
}

export async function signInWithAccount(input: AccountLoginInput): Promise<AuthActionResult> {
  return runAuthAction(
    async () => {
      const authResult = isEmailAddress(input.identifier)
        ? await authClient.signIn.email({ email: input.identifier, password: input.password })
        : await authClient.signIn.username({
            username: input.identifier,
            password: input.password,
          });

      if (authResult.error) {
        throw authActionError(authResult.error, "signIn");
      }
    },
    "signIn",
    reloadAfterAuth,
  );
}

export async function signUpWithAccount(input: AccountSignUpInput): Promise<AuthActionResult> {
  return runAuthAction(
    async () => {
      const authResult = await authClient.signUp.email({
        email: input.email,
        name: input.name,
        password: input.password,
        username: input.username,
      });

      if (authResult.error) {
        throw authActionError(authResult.error, "signUp");
      }
      writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);
    },
    "signUp",
    reloadAfterAuth,
  );
}

export async function signInWithPasskey(): Promise<AuthActionResult> {
  return runAuthAction(
    async () => {
      const authResult = await authClient.signIn.passkey();
      if (authResult.error) {
        throw authActionError(authResult.error, "signInPasskey");
      }
    },
    "signInPasskey",
    reloadAfterAuth,
  );
}

export async function signInWithNotion(): Promise<AuthActionResult> {
  writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, true);
  const result = await runAuthAction(async () => {
    const authResult = await authClient.signIn.social({ provider: "notion" });
    if (authResult.error) {
      throw authActionError(authResult.error, "signIn");
    }
  }, "signIn");
  if (Result.isError(result)) {
    //? リダイレクトが起きなかったので、サインアップ後プロンプトへの誤昇格を防ぐ
    writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, false);
  }
  return result;
}

export async function signOutAndReload(): Promise<AuthActionResult> {
  return runAuthAction(
    async () => {
      const authResult = await authClient.signOut();
      if (authResult.error) {
        //? サインアウト専用の AuthErrorContext は未定義(auth-error-messages.ts は本タスクの所有ファイル外)。
        //? ここは固定文言で通知する
        throw new AuthActionError({
          cause: authResult.error,
          message: "ログアウトに失敗しました。時間をおいて、もう一度お試しください。",
        });
      }
    },
    "signIn",
    reloadAfterAuth,
  );
}

export type { AuthActionResult } from "~/lib/auth-action-result";
