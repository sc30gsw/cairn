import type { GenericCtx } from "@convex-dev/better-auth";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test } from "vite-plus/test";

import { api } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { createAuthOptions } from "./auth";
import schema from "./schema";

const stubCtx = {} as unknown as GenericCtx<DataModel>;

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
  "!./auth.ts",
  "!./betterAuth/**",
  "!./convex.config.ts",
  "!./crons.ts",
  "!./http.ts",
  "!./migrations.ts",
]);

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

test("Google OAuth 未設定なら googleSignIn は false", async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;

  const t = convexTest(schema, modules);
  const config = await t.query(api.queries.auth.publicConfig.publicConfig, {});

  expect(config).toEqual({ googleSignIn: false, signUpEnabled: true });
});

test("Google OAuth 設定済みなら googleSignIn は true", async () => {
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";

  const t = convexTest(schema, modules);
  const config = await t.query(api.queries.auth.publicConfig.publicConfig, {});

  expect(config).toEqual({ googleSignIn: true, signUpEnabled: true });
});

test("AUTH_DISABLE_SIGNUP なら signUpEnabled は false", async () => {
  process.env.AUTH_DISABLE_SIGNUP = "true";

  const t = convexTest(schema, modules);
  const config = await t.query(api.queries.auth.publicConfig.publicConfig, {});

  expect(config.signUpEnabled).toBe(false);
});

test("AUTH_DISABLE_SIGNUP なら google socialProvider の disableSignUp も true になる", () => {
  process.env.AUTH_DISABLE_SIGNUP = "true";
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";

  const options = createAuthOptions(stubCtx);

  expect(options.socialProviders?.google?.disableSignUp).toBe(true);
});

test("Google はオフラインアクセスで、同じメールのサインインを既存ユーザーへ繋ぐ", () => {
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";

  const options = createAuthOptions(stubCtx);

  expect(options.socialProviders?.google?.accessType).toBe("offline");
  expect(options.socialProviders?.google?.prompt).toBe("select_account");
  expect(options.socialProviders?.google).not.toHaveProperty("scope");
  expect(options.account?.encryptOAuthTokens).toBe(true);
  expect(options.account?.accountLinking?.trustedProviders).toEqual(["google"]);
  expect(options.account?.accountLinking?.allowDifferentEmails).toBe(true);
});

test("AUTH_DISABLE_SIGNUP が未設定なら google socialProvider の disableSignUp は false", () => {
  delete process.env.AUTH_DISABLE_SIGNUP;
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";

  const options = createAuthOptions(stubCtx);

  expect(options.socialProviders?.google?.disableSignUp).toBe(false);
});
