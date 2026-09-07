import { memoryAdapter } from "better-auth/adapters/memory";
import { betterAuth } from "better-auth/minimal";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { calendarGoogleAuth } from "./calendarGoogleAuth";
import { GOOGLE_CALENDAR_READ_SCOPES } from "./calendarSync";

const ORIGIN = "http://localhost:3000";
const SECRET = "test-calendar-google-auth-secret-at-least-32-characters";
const READ_SCOPES = [...GOOGLE_CALENDAR_READ_SCOPES];

function idToken(subject: string, email = `${subject}@example.com`) {
  return [
    Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(
      JSON.stringify({ sub: subject, email, email_verified: true, name: subject }),
    ).toString("base64url"),
    "test-signature",
  ].join(".");
}

function setup() {
  const denied = new Set<string>();
  const requests = new Map<string, { ownerId: string; subject?: string }>();
  const authorize = vi.fn(
    async (args: { googleAccountId: string; ownerId: string; requestId: string }) => {
      const request = requests.get(args.requestId);
      if (!request || request.ownerId !== args.ownerId || request.subject) {
        return false;
      }
      denied.add(args.googleAccountId);
      request.subject = args.googleAccountId;
      return true;
    },
  );
  const canSignIn = vi.fn(async (subject: string) => !denied.has(subject));
  const database = { user: [], account: [], session: [], verification: [] };
  const auth = betterAuth({
    ...calendarGoogleAuth(
      {
        clientId: "client-id",
        clientSecret: "client-secret",
        verifyIdToken: () => Promise.resolve(true),
      },
      { authorize, canSignIn },
    ),
    account: {
      accountLinking: { allowDifferentEmails: true, enabled: true, trustedProviders: ["google"] },
    },
    baseURL: ORIGIN,
    database: memoryAdapter(database),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
    secret: SECRET,
    trustedOrigins: [ORIGIN],
  });
  return { auth, authorize, canSignIn, database, denied, requests };
}

function cookieHeader(headers: Headers) {
  return headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

afterEach(() => vi.unstubAllGlobals());

test("カレンダー専用の Google subject は直接 idToken ログインで session を作れない", async () => {
  const { auth, database, denied } = setup();
  denied.add("work");
  await expect(
    auth.api.signInSocial({
      body: { provider: "google", idToken: { token: idToken("work") } },
    }),
  ).rejects.toThrow();
  expect(database.session).toHaveLength(0);
  expect(database.account).toHaveLength(0);
});

test("従来の Google subject は直接 idToken ログインを維持する", async () => {
  const { auth, database } = setup();
  const response = await auth.api.signInSocial({
    body: { provider: "google", idToken: { token: idToken("personal") } },
  });
  expect("user" in response && response.user.email).toBe("personal@example.com");
  expect(database.session).toHaveLength(1);
});

test("プロフィール取得後に禁止された subject にも session を発行しない", async () => {
  const { auth, canSignIn, database } = setup();
  canSignIn.mockResolvedValueOnce(true).mockResolvedValue(false);
  await expect(
    auth.api.signInSocial({
      body: { provider: "google", idToken: { token: idToken("work") } },
    }),
  ).rejects.toThrow();
  expect(database.session).toHaveLength(0);
  expect(canSignIn).toHaveBeenCalledTimes(2);
});

test("正規の OAuth link state と一回限りの要求から追加 account を記録し、OAuth ログインを拒否する", async () => {
  const { auth, authorize, canSignIn, database, requests } = setup();
  const signedUp = await auth.api.signUpEmail({
    body: { email: "owner@example.com", name: "Owner", password: "strong-test-password" },
    returnHeaders: true,
  });
  requests.set("request-work", { ownerId: signedUp.response.user.id });
  const linked = await auth.api.linkSocialAccount({
    body: {
      provider: "google",
      additionalData: { calendarRequestId: "request-work" },
      callbackURL: `${ORIGIN}/board?calendarRequestId=request-work`,
      disableRedirect: true,
      scopes: READ_SCOPES,
    },
    headers: { cookie: cookieHeader(signedUp.headers), origin: ORIGIN },
    returnHeaders: true,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "work-access",
            expires_in: 3600,
            id_token: idToken("work"),
            refresh_token: "work-refresh",
            scope: READ_SCOPES.join(" "),
            token_type: "Bearer",
          }),
          { headers: { "content-type": "application/json" } },
        ),
    ),
  );
  const linkState = new URL(linked.response.url).searchParams.get("state")!;
  const linkedResponse = await auth.handler(
    new Request(`${ORIGIN}/api/auth/callback/google?code=work-code&state=${linkState}`, {
      headers: { cookie: cookieHeader(linked.headers) },
    }),
  );
  expect(linkedResponse.status).toBe(302);
  expect(linkedResponse.headers.get("location")).toBe(
    `${ORIGIN}/board?calendarRequestId=request-work`,
  );
  expect(authorize).toHaveBeenCalledWith({
    googleAccountId: "work",
    ownerId: signedUp.response.user.id,
    requestId: "request-work",
  });
  expect(database.account).toHaveLength(2);
  expect(database.session).toHaveLength(1);
  const signIn = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: `${ORIGIN}/board`, disableRedirect: true },
    returnHeaders: true,
  });
  const signInState = new URL(signIn.response.url!).searchParams.get("state")!;
  const signInResponse = await auth.handler(
    new Request(`${ORIGIN}/api/auth/callback/google?code=work-code&state=${signInState}`, {
      headers: { cookie: cookieHeader(signIn.headers) },
    }),
  );
  expect(signInResponse.status).toBe(302);
  expect(signInResponse.headers.get("location")).toContain("unable_to_get_user_info");
  expect(database.session).toHaveLength(1);
  const token = await auth.api.getAccessToken({
    body: { providerId: "google", accountId: "work", userId: signedUp.response.user.id },
  });
  expect(token.accessToken).toBe("work-access");
  const info = await auth.api.accountInfo({
    query: { providerId: "google", accountId: "work", userId: signedUp.response.user.id },
  });
  expect(info?.user.id).toBe("work");
  const context = await auth.$context;
  const account = await context.internalAdapter.findAccountByProviderId("work", "google");
  expect(account).not.toBeNull();
  await context.internalAdapter.updateAccount(account!.id, { accessTokenExpiresAt: new Date(0) });
  const signInChecks = canSignIn.mock.calls.length;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "refreshed-work-access",
            expires_in: 3600,
            token_type: "Bearer",
          }),
          { headers: { "content-type": "application/json" } },
        ),
    ),
  );
  const refreshed = await auth.api.getAccessToken({
    body: {
      providerId: "google",
      accountId: "work",
      userId: signedUp.response.user.id,
    },
  });
  expect(refreshed.accessToken).toBe("refreshed-work-access");
  expect(canSignIn).toHaveBeenCalledTimes(signInChecks);
});
