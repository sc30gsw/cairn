import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import schema from "../../schema";
import { finishCalendarPull } from "./finishCalendarPull";

const modules = import.meta.glob([
  "../../**/*.ts",
  "!../../**/*.test.ts",
  "!../../auth.config.ts",
  "!../../auth.ts",
  "!../../betterAuth/**",
  "!../../convex.config.ts",
  "!../../crons.ts",
  "!../../http.ts",
  "!../../migrations.ts",
]);

const base = { calendarId: "primary", ownerId: "owner" };

async function cursorOf(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => ctx.db.query("calendarSyncCursors").unique());
}

test("全件取り込みは fullSyncedOnJst を当日に置き、差分取り込みは元の日付を引き継ぐ", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) =>
    finishCalendarPull(ctx, { ...base, keepEventIds: [], syncToken: "t1", todayJst: "2026-08-10" }),
  );
  expect(await cursorOf(t)).toMatchObject({ fullSyncedOnJst: "2026-08-10", syncToken: "t1" });

  await t.run(async (ctx) =>
    finishCalendarPull(ctx, {
      ...base,
      keepEventIds: null,
      syncToken: "t2",
      todayJst: "2026-08-15",
    }),
  );
  expect(await cursorOf(t)).toMatchObject({ fullSyncedOnJst: "2026-08-10", syncToken: "t2" });

  await t.run(async (ctx) =>
    finishCalendarPull(ctx, {
      ...base,
      keepEventIds: ["a"],
      syncToken: "t3",
      todayJst: "2026-08-17",
    }),
  );
  expect(await cursorOf(t)).toMatchObject({ fullSyncedOnJst: "2026-08-17", syncToken: "t3" });
});

test("差分トークンが返らなければ保存済みのカーソルを捨て、次回は全件取り込みになる", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) =>
    finishCalendarPull(ctx, { ...base, keepEventIds: [], syncToken: "t1", todayJst: "2026-08-10" }),
  );
  await t.run(async (ctx) =>
    finishCalendarPull(ctx, {
      ...base,
      keepEventIds: null,
      syncToken: null,
      todayJst: "2026-08-11",
    }),
  );

  expect(await cursorOf(t)).toBeNull();
});

test("全件取り込みで Google に無くなった写しと、期間の外へ出た写しを消す", async () => {
  const t = convexTest(schema, modules);
  const external = {
    allDay: false,
    calendarId: "primary",
    googleUpdated: "u",
    ownerId: "owner",
    title: "x",
  };
  await t.run(async (ctx) => {
    await ctx.db.insert("externalCalendarEvents", {
      ...external,
      endAt: "2026-08-20 11:00:00",
      googleEventId: "kept",
      startAt: "2026-08-20 10:00:00",
    });
    await ctx.db.insert("externalCalendarEvents", {
      ...external,
      endAt: "2026-08-21 11:00:00",
      googleEventId: "gone",
      startAt: "2026-08-21 10:00:00",
    });
    await ctx.db.insert("externalCalendarEvents", {
      ...external,
      endAt: "2026-05-01 11:00:00",
      googleEventId: "old",
      startAt: "2026-05-01 10:00:00",
    });
  });

  await t.run(async (ctx) =>
    finishCalendarPull(ctx, {
      ...base,
      keepEventIds: ["kept", "old"],
      syncToken: "t1",
      todayJst: "2026-08-17",
    }),
  );

  const remaining = await t.run(async (ctx) => ctx.db.query("externalCalendarEvents").collect());
  expect(remaining.map((event) => event.googleEventId)).toEqual(["kept"]);
});
