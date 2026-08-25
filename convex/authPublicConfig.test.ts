import type { GenericCtx } from "@convex-dev/better-auth";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test } from "vite-plus/test";

import { api } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { createAuthOptions } from "./auth";
import schema from "./schema";

// createAuthOptions は ctx を authComponent.adapter(ctx) 経由で遅延評価のアダプタ工場に
// 渡すだけで、この工場は betterAuth(...) が実際に db 操作するまで呼び出されない。
// そのためテストでは中身を使わないダミー ctx で十分。
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

test("Notion OAuth 未設定なら notionSignIn は false", async () => {
  delete process.env.NOTION_CLIENT_ID;
  delete process.env.NOTION_CLIENT_SECRET;

  const t = convexTest(schema, modules);
  const config = await t.query(api.queries.auth.publicConfig.publicConfig, {});

  expect(config).toEqual({ notionSignIn: false, signUpEnabled: true });
});

test("Notion OAuth 設定済みなら notionSignIn は true", async () => {
  process.env.NOTION_CLIENT_ID = "client-id";
  process.env.NOTION_CLIENT_SECRET = "client-secret";

  const t = convexTest(schema, modules);
  const config = await t.query(api.queries.auth.publicConfig.publicConfig, {});

  expect(config).toEqual({ notionSignIn: true, signUpEnabled: true });
});

test("AUTH_DISABLE_SIGNUP なら signUpEnabled は false", async () => {
  process.env.AUTH_DISABLE_SIGNUP = "true";

  const t = convexTest(schema, modules);
  const config = await t.query(api.queries.auth.publicConfig.publicConfig, {});

  expect(config.signUpEnabled).toBe(false);
});

test("AUTH_DISABLE_SIGNUP なら notion socialProvider の disableSignUp も true になる", () => {
  process.env.AUTH_DISABLE_SIGNUP = "true";
  process.env.NOTION_CLIENT_ID = "client-id";
  process.env.NOTION_CLIENT_SECRET = "client-secret";

  const options = createAuthOptions(stubCtx);

  // emailAndPassword.disableSignUp だけでは OAuth コールバックの暗黙サインアップを
  // 止められない(better-auth 1.6.28 の callback.mjs は provider.options?.disableSignUp を見る)。
  // プロバイダ単位のフラグが env と一致していることを固定する回帰テスト。
  expect(options.socialProviders?.notion?.disableSignUp).toBe(true);
});

test("AUTH_DISABLE_SIGNUP が未設定なら notion socialProvider の disableSignUp は false", () => {
  delete process.env.AUTH_DISABLE_SIGNUP;
  process.env.NOTION_CLIENT_ID = "client-id";
  process.env.NOTION_CLIENT_SECRET = "client-secret";

  const options = createAuthOptions(stubCtx);

  expect(options.socialProviders?.notion?.disableSignUp).toBe(false);
});
