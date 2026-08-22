import { Result } from "better-result";

import type {
  AccountLoginInput,
  AccountSignUpInput,
} from "~/features/auth/schemas/account-auth-schema";
import { isEmailAddress } from "~/features/auth/schemas/account-auth-schema";
import { authClient } from "~/lib/auth-client";
import { type AuthErrorContext, presentAuthError } from "~/lib/auth-error-messages";
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

function authActionError(error: unknown, context: AuthErrorContext): AuthActionError {
  return new AuthActionError({ cause: error, message: presentAuthError(error, context) });
}

function authActionErrorFromUnknown(cause: unknown, context: AuthErrorContext): AuthActionError {
  if (cause instanceof AuthActionError) {
    return cause;
  }
  return authActionError(cause, context);
}

async function runAuthAction(
  action: () => Promise<void>,
  context: AuthErrorContext,
): Promise<AuthActionResult> {
  const result = await Result.tryPromise({
    catch: (cause) => authActionErrorFromUnknown(cause, context),
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
      throw authActionError(authResult.error, "signIn");
    }
  }, "signIn");
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
      throw authActionError(authResult.error, "signUp");
    }
    writePasskeyFlag(PASSKEY_SIGNUP_PROMPT_KEY, true);
  }, "signUp");
}

export async function signInWithPasskey(): Promise<AuthActionResult> {
  return runAuthAction(async () => {
    const authResult = await authClient.signIn.passkey();
    if (authResult.error) {
      throw authActionError(authResult.error, "signInPasskey");
    }
  }, "signInPasskey");
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
