import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
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

const OWNER = { email: "owner@example.com", subject: "owner-subject" };

async function storeTestBlob(t: ReturnType<typeof convexTest>): Promise<Id<"_storage">> {
  return await t.run(async (ctx) =>
    ctx.storage.store(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" })),
  );
}

test("未認証の profile.generateAvatarUploadUrl は throw する", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl, {}),
  ).rejects.toThrow();
});

test("認証済み owner は avatar upload URL を取得できる", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const uploadUrl = await asOwner.mutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
    {},
  );
  expect(uploadUrl).toMatch(/^https?:\/\//);
});

test("未認証の profile.getAvatarUrl は throw する", async () => {
  const t = convexTest(schema, modules);
  const storageId = await storeTestBlob(t);

  await expect(
    t.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId }),
  ).rejects.toThrow();
});

test("getAvatarUrl は contentType 未設定の storage を拒否する", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await storeTestBlob(t);

  await expect(
    asOwner.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId }),
  ).rejects.toThrow("JPEG または PNG");
});
