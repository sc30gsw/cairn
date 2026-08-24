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
  "!./migrations.ts",
]);

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const OTHER_OWNER = { email: "other@example.com", subject: "other-subject" };

async function storeTestBlob(
  t: ReturnType<typeof convexTest>,
  contentType = "image/png",
): Promise<Id<"_storage">> {
  return await t.run(async (ctx) =>
    ctx.storage.store(new Blob([new Uint8Array([1, 2, 3])], { type: contentType })),
  );
}

async function registerStorageForOwner(
  t: ReturnType<typeof convexTest>,
  ownerSubject: string,
  storageId: Id<"_storage">,
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("avatarUploads", { ownerId: ownerSubject, storageId });
  });
}

test("未認証の profile.generateAvatarUploadUrl は throw する", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl, {}),
  ).rejects.toThrow();
});

test("認証済み owner は avatar upload URL と claimId を取得できる", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const result = await asOwner.mutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
    {},
  );
  expect(result.uploadUrl).toMatch(/^https?:\/\//);
  expect(result.claimId).toBeTruthy();
});

test("未認証の profile.getAvatarUrl は throw する", async () => {
  const t = convexTest(schema, modules);
  const storageId = await storeTestBlob(t);

  await expect(
    t.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId }),
  ).rejects.toThrow();
});

test("getAvatarUrl は claim 前の storage を拒否する", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await storeTestBlob(t);

  await expect(
    asOwner.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId }),
  ).rejects.toThrow("この画像にアクセスする権限がありません");
});

test("getAvatarUrl は他 owner が claim した storage を拒否する", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await storeTestBlob(t);

  await registerStorageForOwner(t, OTHER_OWNER.subject, storageId);

  await expect(
    asOwner.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId }),
  ).rejects.toThrow("この画像にアクセスする権限がありません");
});

test("claim 後の getAvatarUrl は URL を返す", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await storeTestBlob(t);

  await registerStorageForOwner(t, OWNER.subject, storageId);

  const url = await asOwner.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId });
  expect(url).toMatch(/^https?:\/\//);
});

test("claimAvatarUpload は contentType 未設定の storage を拒否する", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await t.run(async (ctx) =>
    ctx.storage.store(new Blob([new Uint8Array([1, 2, 3])])),
  );
  const { claimId } = await asOwner.mutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
    {},
  );

  await expect(
    asOwner.mutation(api.mutations.profile.claimAvatarUpload.claimAvatarUpload, {
      claimId,
      storageId,
    }),
  ).rejects.toThrow("JPEG または PNG");
});

test("claimAvatarUpload は他人の claimId を拒否する", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const asOther = t.withIdentity(OTHER_OWNER);
  const storageId = await storeTestBlob(t);

  const { claimId } = await asOther.mutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
    {},
  );

  await expect(
    asOwner.mutation(api.mutations.profile.claimAvatarUpload.claimAvatarUpload, {
      claimId,
      storageId,
    }),
  ).rejects.toThrow("アップロードの認可が無効です");
});
