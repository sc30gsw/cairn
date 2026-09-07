import { symmetricEncrypt } from "better-auth/crypto";
import { Result } from "better-result";
import { validate } from "convex-helpers/validators";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { components } from "../_generated/api";
import authSchema from "../betterAuth/schema";
import schema from "../schema";
import { getGoogleAccessToken } from "./googleAccessToken";

const modules = import.meta.glob(["../**/*.ts", "!../**/*.test.ts", "!../betterAuth/**"]);
const authModules = import.meta.glob("../betterAuth/**/*.ts");
const secret = "calendar-token-test-secret-with-more-than-32-characters";

beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_SECRET", secret);
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("CONVEX_SITE_URL", "http://localhost:3211");
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function setup() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", authSchema, authModules);
  const [accessToken, refreshToken] = await Promise.all([
    symmetricEncrypt({ key: secret, data: "old-access-token" }),
    symmetricEncrypt({ key: secret, data: "test-refresh-token" }),
  ]);
  const account = await t.run(async (ctx) => {
    const created: unknown = await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "account",
        data: {
          userId: "owner",
          providerId: "google",
          accountId: "google-subject",
          accessToken,
          refreshToken,
          accessTokenExpiresAt: Date.now() - 10000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    });
    if (!validate(authSchema.doc("account"), created))
      throw new Error("Invalid auth account fixture");
    return created;
  });
  return { t, account };
}

test.each([
  [400, "invalid_grant", true],
  [400, "invalid_client", false],
  [503, "temporarily_unavailable", false],
  [500, "invalid_grant", false],
])(
  "Google refresh %i %s is classified without losing its revocation distinction",
  async (status, error, revoked) => {
    const { t } = await setup();
    const fetch = vi.fn(async (_input: RequestInfo | URL) => Response.json({ error }, { status }));
    vi.stubGlobal("fetch", fetch);
    await t.action(async (ctx) => {
      const result = await getGoogleAccessToken(ctx, {
        userId: "owner",
        accountId: "google-subject",
      });
      expect(Result.isError(result)).toBe(true);
      if (Result.isError(result)) {
        expect(result.error.revoked).toBe(revoked);
        expect(result.error.cause).toMatchObject({ body: { code: "FAILED_TO_GET_ACCESS_TOKEN" } });
      }
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toBe("https://oauth2.googleapis.com/token");
  },
);

test("network failures cannot authorize destructive disconnect cleanup", async () => {
  const { t } = await setup();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("fetch failed");
    }),
  );
  await t.action(async (ctx) => {
    const result = await getGoogleAccessToken(ctx, {
      userId: "owner",
      accountId: "google-subject",
    });
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) expect(result.error.revoked).toBe(false);
  });
});

test("successful refresh persists the new access token and avoids repeated refresh", async () => {
  const { t } = await setup();
  const fetch = vi.fn(async () =>
    Response.json({ access_token: "fresh-token", expires_in: 3600, token_type: "Bearer" }),
  );
  vi.stubGlobal("fetch", fetch);
  const read = () =>
    t.action(async (ctx) => {
      const result = await getGoogleAccessToken(ctx, {
        userId: "owner",
        accountId: "google-subject",
      });
      expect(result).toEqual(Result.ok("fresh-token"));
    });
  await read();
  await read();
  expect(fetch).toHaveBeenCalledTimes(1);
});
