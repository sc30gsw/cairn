import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

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
  "!./migrations.ts",
]);

const OWNER = { email: "owner@example.com", subject: "owner-subject" };

test("未認証の session.get は throw する", async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(api.queries.session.get.get, {})).rejects.toThrow();
});

test("認証済みユーザーなら session.get が通る", async () => {
  const t = convexTest(schema, modules);
  const asUser = t.withIdentity({ email: "user@example.com", subject: "user-subject" });
  const session = await asUser.query(api.queries.session.get.get, {});
  expect(session).toEqual({ ownerId: "user-subject" });
});

test("所有者なら session.get が通る", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const session = await asOwner.query(api.queries.session.get.get, {});
  expect(session).toEqual({ ownerId: "owner-subject" });
});
