import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test } from "vite-plus/test";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
  "!./auth.ts",
  "!./betterAuth/**",
  "!./convex.config.ts",
  "!./crons.ts",
  "!./http.ts",
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

  expect(config).toEqual({ notionSignIn: false });
});

test("Notion OAuth 設定済みなら notionSignIn は true", async () => {
  process.env.NOTION_CLIENT_ID = "client-id";
  process.env.NOTION_CLIENT_SECRET = "client-secret";

  const t = convexTest(schema, modules);
  const config = await t.query(api.queries.auth.publicConfig.publicConfig, {});

  expect(config).toEqual({ notionSignIn: true });
});
