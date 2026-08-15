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
]);

const ALLOWED_EMAIL = "owner@example.com";
const OWNER = { email: ALLOWED_EMAIL, subject: "owner-subject" };

test("未認証の session.get は throw する", async () => {
  process.env.ALLOWED_EMAIL = ALLOWED_EMAIL;
  const t = convexTest(schema, modules);
  await expect(t.query(api.session.get, {})).rejects.toThrow();
});

test("allowlist 外は throw する", async () => {
  process.env.ALLOWED_EMAIL = ALLOWED_EMAIL;
  const t = convexTest(schema, modules);
  const asOther = t.withIdentity({ email: "other@example.com", subject: "other" });
  await expect(asOther.query(api.session.get, {})).rejects.toThrow();
});

test("所有者なら session.get が通る", async () => {
  process.env.ALLOWED_EMAIL = ALLOWED_EMAIL;
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const session = await asOwner.query(api.session.get, {});
  expect(session).toEqual({ ownerId: "owner-subject" });
});
