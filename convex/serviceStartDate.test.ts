import { validate } from "convex-helpers/validators";
import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { convexModules } from "../src/test-utils/convex-modules";
import { api, components } from "./_generated/api";
import authSchema from "./betterAuth/schema";
import schema from "./schema";
import { serviceStartDate } from "./services/days/serviceStartDate";

const authModules = import.meta.glob("./betterAuth/**/*.ts");

async function registeredOwner(createdAt: string) {
  const t = convexTest(schema, convexModules);
  t.registerComponent("betterAuth", authSchema, authModules);
  const user = await t.run(async (ctx) => {
    const result: unknown = await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: "利用者",
          email: "registered@example.com",
          emailVerified: true,
          createdAt: Date.parse(createdAt),
          updatedAt: Date.parse(createdAt),
        },
      },
    });
    if (!validate(authSchema.doc("user"), result)) throw new Error("Invalid auth user fixture");
    return result;
  });
  return { t, owner: t.withIdentity({ subject: user._id }), ownerId: user._id };
}

test.each([
  ["2026-08-16T14:59:59.999Z", "2026-08-16"],
  ["2026-08-16T15:00:00.000Z", "2026-08-17"],
])("登録日時 %s から日本時間の利用開始日 %s を得る", async (timestamp, expected) => {
  const { t, ownerId } = await registeredOwner(timestamp);
  expect(await t.run((ctx) => serviceStartDate(ctx, ownerId))).toBe(expected);
});

test("存在しない認証ユーザーの登録日を捏造しない", async () => {
  const { t } = await registeredOwner("2026-08-16T15:00:00.000Z");
  await expect(t.run((ctx) => serviceStartDate(ctx, "missing-user"))).rejects.toThrow();
});

test("登録日前の未記録日を区別し、過去に入力した記録を優先する", async () => {
  const { owner } = await registeredOwner("2026-08-16T15:00:00.000Z");
  const before = { dateJst: "2026-08-16", todayJst: "2026-08-17" };
  expect((await owner.query(api.queries.days.get.get, before)).kind).toBe("beforeRegistration");
  await owner.mutation(api.mutations.days.open.open, before);
  expect((await owner.query(api.queries.days.get.get, before)).kind).toBe("beforeRegistration");
  await owner.mutation(api.mutations.days.setMemo.setMemo, { ...before, memo: "登録前の学習" });
  const day = await owner.query(api.queries.days.get.get, before);
  expect(day.kind).toBe("live");
  expect(day.day?.memo).toBe("登録前の学習");
  const month = await owner.query(api.queries.history.month.month, {
    todayJst: before.todayJst,
    yearMonth: "2026-08",
  });
  expect(month.days.find((entry) => entry.dateJst === "2026-08-15")?.kind).toBe(
    "beforeRegistration",
  );
  expect(month.days.find((entry) => entry.dateJst === before.dateJst)?.kind).toBe("live");
  expect(
    (
      await owner.query(api.queries.days.get.get, {
        dateJst: before.todayJst,
        todayJst: before.todayJst,
      })
    ).kind,
  ).toBe("todayEmpty");
});
