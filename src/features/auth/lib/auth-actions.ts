import type {
  AccountLoginInput,
  AccountSignUpInput,
} from "~/features/auth/schemas/account-auth-schema";
import { isEmailAddress } from "~/features/auth/schemas/account-auth-schema";
import { type AuthActionResult, runAuthAction } from "~/lib/auth-action-result";
import { authClient } from "~/lib/auth-client";
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

export function signInWithNotion() {
  writePasskeySessionFlag(PASSKEY_OAUTH_PENDING_KEY, true);
  void authClient.signIn.social({ provider: "notion" });
}

export function signOutAndReload() {
  void authClient.signOut({
    fetchOptions: {
      onSuccess: reloadAfterAuth,
    },
  });
}

export type { AuthActionResult } from "~/lib/auth-action-result";
