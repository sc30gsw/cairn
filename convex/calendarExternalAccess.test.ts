import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { api } from "./_generated/api";
import schema from "./schema";
import { moveExternal, removeExternal } from "./services/calendarSync/externalEvents";

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

async function setup(accessRole: string | undefined) {
  const t = convexTest(schema, modules);
  const externalId = await t.run(async (ctx) => {
    await ctx.db.insert("calendarConnections", {
      calendars: [{ accessRole, id: "calendar", primary: true, summary: "予定" }],
      googleAccountId: "google-owner",
      ownerId: "owner",
      primaryCalendarId: "calendar",
      status: "ok",
      visibleCalendarIds: ["calendar"],
    });
    return await ctx.db.insert("externalCalendarEvents", {
      allDay: false,
      calendarId: "calendar",
      googleEventId: "night",
      googleUpdated: "2026-08-16T00:00:00Z",
      ownerId: "owner",
      startAt: "2026-08-16 23:00:00",
      endAt: "2026-08-17 02:00:00",
      title: "夜間作業",
    });
  });
  return { externalId, t };
}

test.each(["reader", "freeBusyReader", undefined])(
  "権限 %s の予定は表示できても移動・削除できない",
  async (role) => {
    const { t, externalId } = await setup(role);
    const owner = t.withIdentity({ subject: "owner" });
    const events = await owner.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: "2026-08-17",
      view: "day",
    });
    expect(events).toMatchObject([{ _id: externalId, canEdit: false }]);
    await expect(
      owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
        externalId,
        startAt: "2026-08-17 10:00:00",
        endAt: "2026-08-17 11:00:00",
      }),
    ).rejects.toThrow(/権限がありません/);
    await expect(
      owner.mutation(api.mutations.calendarSync.removeExternal.removeExternal, { externalId }),
    ).rejects.toThrow(/権限がありません/);
    await t.run(async (ctx) => {
      expect(await ctx.db.get("externalCalendarEvents", externalId)).toMatchObject({
        startAt: "2026-08-16 23:00:00",
      });
      expect(await ctx.db.query("calendarConnections").unique()).toMatchObject({ status: "ok" });
    });
  },
);

test.each(["owner", "writer", "writerWithoutPrivateAccess"])(
  "権限 %s の予定は移動・削除できる",
  async (role) => {
    const { t, externalId } = await setup(role);
    const events = await t
      .withIdentity({ subject: "owner" })
      .query(api.queries.calendarSync.listExternal.listExternal, {
        anchorDateJst: "2026-08-17",
        view: "day",
      });
    expect(events).toMatchObject([{ canEdit: true }]);
    await t.run(async (ctx) =>
      moveExternal(ctx, "owner", {
        externalId,
        startAt: "2026-08-17 10:00:00",
        endAt: "2026-08-17 11:00:00",
      }),
    );
    expect(
      await t.run(async (ctx) => ctx.db.get("externalCalendarEvents", externalId)),
    ).toMatchObject({ startAt: "2026-08-17 10:00:00" });
    await t.run(async (ctx) => removeExternal(ctx, "owner", { externalId }));
    expect(await t.run(async (ctx) => ctx.db.get("externalCalendarEvents", externalId))).toBeNull();
  },
);

test("解除途中のカレンダーは読み取り専用となり、移動・削除を拒否する", async () => {
  const { t, externalId } = await setup("owner");
  await t.run(async (ctx) => {
    const connection = await ctx.db.query("calendarConnections").unique();
    if (connection === null) throw new Error("missing connection");
    await ctx.db.patch("calendarConnections", connection._id, { disconnecting: true });
  });
  const owner = t.withIdentity({ subject: "owner" });
  expect(
    await owner.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: "2026-08-17",
      view: "day",
    }),
  ).toMatchObject([{ canEdit: false }]);
  await expect(
    owner.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
      externalId,
      startAt: "2026-08-17 10:00:00",
      endAt: "2026-08-17 11:00:00",
    }),
  ).rejects.toThrow();
  await expect(
    owner.mutation(api.mutations.calendarSync.removeExternal.removeExternal, { externalId }),
  ).rejects.toThrow();
  expect(
    await t.run(async (ctx) => ctx.db.get("externalCalendarEvents", externalId)),
  ).not.toBeNull();
});

test("所有者以外と未認証の移動・削除を拒否する", async () => {
  const { t, externalId } = await setup("owner");
  for (const caller of [t, t.withIdentity({ subject: "other" })]) {
    await expect(
      caller.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
        externalId,
        startAt: "2026-08-17 10:00:00",
        endAt: "2026-08-17 11:00:00",
      }),
    ).rejects.toThrow();
    await expect(
      caller.mutation(api.mutations.calendarSync.removeExternal.removeExternal, { externalId }),
    ).rejects.toThrow();
  }
  expect(
    await t
      .withIdentity({ subject: "other" })
      .query(api.queries.calendarSync.listExternal.listExternal, {
        anchorDateJst: "2026-08-17",
        view: "day",
      }),
  ).toEqual([]);
});

test("日・週境界をまたぐ予定を取得し、範囲端で接するだけの予定を除外する", async () => {
  const { t, externalId } = await setup("owner");
  await t.run(async (ctx) => {
    const base = {
      allDay: false,
      calendarId: "calendar",
      googleUpdated: "2026-08-16T00:00:00Z",
      ownerId: "owner",
      title: "境界",
    };
    await ctx.db.insert("externalCalendarEvents", {
      ...base,
      googleEventId: "before",
      startAt: "2026-08-16 20:00:00",
      endAt: "2026-08-17 00:00:00",
    });
    await ctx.db.insert("externalCalendarEvents", {
      ...base,
      googleEventId: "after",
      startAt: "2026-08-24 00:00:00",
      endAt: "2026-08-24 01:00:00",
    });
  });
  const owner = t.withIdentity({ subject: "owner" });
  for (const view of ["day", "week"] as const) {
    expect(
      await owner.query(api.queries.calendarSync.listExternal.listExternal, {
        anchorDateJst: "2026-08-17",
        view,
      }),
    ).toMatchObject([{ _id: externalId }]);
  }
});
