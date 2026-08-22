import type {
  AccountLoginInput,
  AccountSignUpInput,
} from "~/features/auth/schemas/account-auth-schema";
import { isEmailAddress } from "~/features/auth/schemas/account-auth-schema";
import { authClient } from "~/lib/auth-client";
import { PASSKEY_SIGNUP_PROMPT_KEY, writePasskeyFlag } from "~/lib/passkey-storage";
import { authActionError, runAuthAction, type ActionResult } from "~/lib/run-auth-action";

function reloadAfterAuth() {
  location.reload();
}

export type AuthActionResult = ActionResult;

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
  void authClient.signIn.social({ provider: "notion" });
}

export function signOutAndReload() {
  void authClient.signOut({
    fetchOptions: {
      onSuccess: reloadAfterAuth,
    },
  });
}
