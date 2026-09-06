import { Result, TaggedError } from "better-result";

import type { ActionCtx } from "../_generated/server";
import { authComponent, createAuth } from "../auth";
import { GOOGLE_PROVIDER_ID } from "./calendarSync";

export class GoogleAuthError extends TaggedError("GoogleAuth")<{
  cause?: unknown;
  message: string;
}> {}

export type GoogleAccount = {
  accountId: string;
  scopes: string[];
};

export async function listGoogleAccounts(ctx: ActionCtx): Promise<GoogleAccount[]> {
  const auth = createAuth(ctx);
  const headers = await authComponent.getHeaders(ctx);
  const accounts = await auth.api.listUserAccounts({ headers });
  const google: GoogleAccount[] = [];
  for (const account of accounts) {
    if (account.providerId === GOOGLE_PROVIDER_ID) {
      google.push({ accountId: account.accountId, scopes: account.scopes });
    }
  }
  return google;
}

export async function getGoogleAccessToken(
  ctx: ActionCtx,
  args: { accountId: string; userId: string },
): Promise<Result<string, GoogleAuthError>> {
  const auth = createAuth(ctx);
  const fetched = await Result.tryPromise({
    catch: (cause) =>
      new GoogleAuthError({ cause, message: "Google のアクセストークンを取得できませんでした" }),
    try: () =>
      auth.api.getAccessToken({
        body: { accountId: args.accountId, providerId: GOOGLE_PROVIDER_ID, userId: args.userId },
      }),
  });
  if (Result.isError(fetched)) {
    return fetched;
  }
  return Result.ok(fetched.value.accessToken);
}
