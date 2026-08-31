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
  return await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob([new Uint8Array([1, 2, 3])], { type: contentType }),
    );
    await ctx.db.patch("_storage", storageId, { contentType });
    return storageId;
  });
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

async function expectDomainError(promise: Promise<unknown>, tag: string, message: string) {
  await expect(promise).rejects.toMatchObject({ data: { message, tag } });
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

test("getAvatarUrl は未 claim の storage には null を返す(想定内の欠落)", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await storeTestBlob(t);

  const url = await asOwner.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId });
  expect(url).toBeNull();
});

test("getAvatarUrl は blob が既に削除された avatarUploads にも null を返す", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await storeTestBlob(t);
  await registerStorageForOwner(t, OWNER.subject, storageId);
  await t.run(async (ctx) => ctx.storage.delete(storageId));

  const url = await asOwner.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId });
  expect(url).toBeNull();
});

test("getAvatarUrl は他 owner が claim した storage を ForbiddenError で拒否する", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await storeTestBlob(t);

  await registerStorageForOwner(t, OTHER_OWNER.subject, storageId);

  await expectDomainError(
    asOwner.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId }),
    "Forbidden",
    "この画像にアクセスする権限がありません",
  );
});

test("claim 後の getAvatarUrl は URL を返す", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await storeTestBlob(t);

  await registerStorageForOwner(t, OWNER.subject, storageId);

  const url = await asOwner.query(api.queries.profile.getAvatarUrl.getAvatarUrl, { storageId });
  expect(url).toMatch(/^https?:\/\//);
});

test("claimAvatarUpload は metadata の無い storage を NotFoundError で拒否する", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await storeTestBlob(t);
  const { claimId } = await asOwner.mutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
    {},
  );
  await t.run(async (ctx) => ctx.storage.delete(storageId));

  await expectDomainError(
    asOwner.mutation(api.mutations.profile.claimAvatarUpload.claimAvatarUpload, {
      claimId,
      storageId,
    }),
    "NotFound",
    "アップロードした画像が見つかりません",
  );
});

test("claimAvatarUpload は contentType 未設定の storage を ValidationFailedError で拒否する", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await t.run(async (ctx) =>
    ctx.storage.store(new Blob([new Uint8Array([1, 2, 3])])),
  );
  const { claimId } = await asOwner.mutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
    {},
  );

  await expectDomainError(
    asOwner.mutation(api.mutations.profile.claimAvatarUpload.claimAvatarUpload, {
      claimId,
      storageId,
    }),
    "ValidationFailed",
    "JPEG または PNG の画像を選んでください",
  );
});

test("claimAvatarUpload は他人の claimId を ForbiddenError で拒否する", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const asOther = t.withIdentity(OTHER_OWNER);
  const storageId = await storeTestBlob(t);

  const { claimId } = await asOther.mutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
    {},
  );

  await expectDomainError(
    asOwner.mutation(api.mutations.profile.claimAvatarUpload.claimAvatarUpload, {
      claimId,
      storageId,
    }),
    "Forbidden",
    "アップロードの認可が無効です",
  );
});

test("claimAvatarUpload は別アカウントに紐づく storage を ForbiddenError で拒否する", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const storageId = await storeTestBlob(t);
  await registerStorageForOwner(t, OTHER_OWNER.subject, storageId);

  const { claimId } = await asOwner.mutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
    {},
  );

  await expectDomainError(
    asOwner.mutation(api.mutations.profile.claimAvatarUpload.claimAvatarUpload, {
      claimId,
      storageId,
    }),
    "Forbidden",
    "この画像は別のアカウントに紐づいています",
  );
});

test("claimAvatarUpload は再 claim 時に旧アバターの行と blob を消す", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const oldStorageId = await storeTestBlob(t);
  await registerStorageForOwner(t, OWNER.subject, oldStorageId);

  const newStorageId = await storeTestBlob(t);
  const { claimId } = await asOwner.mutation(
    api.mutations.profile.generateAvatarUploadUrl.generateAvatarUploadUrl,
    {},
  );

  await asOwner.mutation(api.mutations.profile.claimAvatarUpload.claimAvatarUpload, {
    claimId,
    storageId: newStorageId,
  });

  const remaining = await t.run(async (ctx) =>
    ctx.db
      .query("avatarUploads")
      .withIndex("by_owner_and_storage", (q) => q.eq("ownerId", OWNER.subject))
      .collect(),
  );
  expect(remaining.map((row) => row.storageId)).toEqual([newStorageId]);

  const oldMetadata = await t.run(async (ctx) => ctx.db.system.get("_storage", oldStorageId));
  expect(oldMetadata).toBeNull();
});
