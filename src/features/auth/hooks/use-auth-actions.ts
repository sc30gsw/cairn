import type {
  AccountLoginInput,
  AccountSignUpInput,
} from "~/features/auth/schemas/account-auth-schema";
import { isEmailAddress } from "~/features/auth/schemas/account-auth-schema";
import { authClient } from "~/lib/auth-client";

function reloadAfterAuth() {
  location.reload();
}

export type AuthActionResult = { errorMessage: null } | { errorMessage: string };

export async function signInWithAccount(input: AccountLoginInput): Promise<AuthActionResult> {
  const result = isEmailAddress(input.identifier)
    ? await authClient.signIn.email({ email: input.identifier, password: input.password })
    : await authClient.signIn.username({ username: input.identifier, password: input.password });

  if (result.error) {
    return { errorMessage: result.error.message ?? "ログインに失敗しました" };
  }

  reloadAfterAuth();
  return { errorMessage: null };
}

export async function signUpWithAccount(input: AccountSignUpInput): Promise<AuthActionResult> {
  const result = await authClient.signUp.email({
    email: input.email,
    name: input.name,
    password: input.password,
    username: input.username,
  });

  if (result.error) {
    return { errorMessage: result.error.message ?? "登録に失敗しました" };
  }

  reloadAfterAuth();
  return { errorMessage: null };
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

export function useAuthActions() {
  return {
    signInWithAccount,
    signInWithNotion,
    signOutAndReload,
    signUpWithAccount,
  };
}
