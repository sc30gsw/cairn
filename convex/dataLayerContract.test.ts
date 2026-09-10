import { convexTest } from "convex-test";
import { expect, test, vi } from "vite-plus/test";

import { convexModules } from "../src/test-utils/convex-modules";
import { api } from "./_generated/api";
import schema from "./schema";

const DATE_JST = "2026-08-17";
const OWNER = { subject: "owner" };

vi.mock("./services/days/serviceStartDate", () => ({ serviceStartDate: async () => "2026-01-01" }));

function asOwner() {
  return convexTest(schema, convexModules).withIdentity(OWNER);
}

async function ownerWithOpenDay() {
  const t = asOwner();
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  await t.mutation(api.mutations.days.open.open, { dateJst: DATE_JST, todayJst: DATE_JST });
  return t;
}

test("data-layer read queries require an authenticated owner", async () => {
  const t = convexTest(schema, convexModules);

  await expect(
    t.query(api.queries.days.get.get, { dateJst: DATE_JST, todayJst: DATE_JST }),
  ).rejects.toThrow();
  await expect(
    t.query(api.queries.boardSchedule.listForWeek.listForWeek, {
      anchorDateJst: DATE_JST,
      view: "week",
    }),
  ).rejects.toThrow();
  await expect(
    t.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: DATE_JST,
      view: "week",
    }),
  ).rejects.toThrow();
});

test("day page keeps document IDs stable and removes soft-deleted rows from its snapshot", async () => {
  const t = await ownerWithOpenDay();
  const before = await t.query(api.queries.days.get.get, {
    dateJst: DATE_JST,
    todayJst: DATE_JST,
  });
  const row = before.rows[0];
  if (before.day === null || row === undefined) {
    throw new Error("expected an open day with a seeded row");
  }

  await t.mutation(api.mutations.days.setMemo.setMemo, {
    dateJst: DATE_JST,
    memo: "同期済み",
    todayJst: DATE_JST,
  });
  const afterMemo = await t.query(api.queries.days.get.get, {
    dateJst: DATE_JST,
    todayJst: DATE_JST,
  });
  expect(afterMemo.day?._id).toBe(before.day._id);
  expect(afterMemo.rows.find((candidate) => candidate._id === row._id)?._id).toBe(row._id);

  await t.mutation(api.mutations.rows.remove.remove, { rowId: row._id });
  const afterRemoval = await t.query(api.queries.days.get.get, {
    dateJst: DATE_JST,
    todayJst: DATE_JST,
  });
  expect(afterRemoval.rows.some((candidate) => candidate._id === row._id)).toBe(false);
});

test("day and board snapshots are owner-isolated, and a rejected order leaves the snapshot unchanged", async () => {
  const backend = convexTest(schema, convexModules);
  const owner = backend.withIdentity(OWNER);
  await owner.mutation(api.mutations.catalog.ensure.ensure, {});
  await owner.mutation(api.mutations.days.open.open, { dateJst: DATE_JST, todayJst: DATE_JST });
  const before = await owner.query(api.queries.days.get.get, {
    dateJst: DATE_JST,
    todayJst: DATE_JST,
  });
  if (before.rows.length < 2) {
    throw new Error("expected at least two seeded rows");
  }
  const invalidOrder = [
    before.rows[0]._id,
    before.rows[0]._id,
    ...before.rows.slice(2).map((row) => row._id),
  ];

  await expect(
    owner.mutation(api.mutations.rows.applyOrder.applyOrder, {
      dateJst: DATE_JST,
      orderedRowIds: invalidOrder,
    }),
  ).rejects.toThrow();
  const after = await owner.query(api.queries.days.get.get, {
    dateJst: DATE_JST,
    todayJst: DATE_JST,
  });
  expect(after.rows.map((row) => row._id)).toEqual(before.rows.map((row) => row._id));

  const other = backend.withIdentity({ subject: "other" });
  expect(
    await other.query(api.queries.days.get.get, { dateJst: DATE_JST, todayJst: DATE_JST }),
  ).toMatchObject({ day: null, rows: [] });
  expect(
    await other.query(api.queries.boardSchedule.listForWeek.listForWeek, {
      anchorDateJst: DATE_JST,
      view: "week",
    }),
  ).toEqual([]);
});

test("external calendar range snapshots preserve IDs, isolate owners, and drop a removed event", async () => {
  const backend = convexTest(schema, convexModules);
  const t = backend.withIdentity(OWNER);
  const externalId = await t.run(async (ctx) => {
    const connectionId = await ctx.db.insert("calendarConnections", {
      calendars: [{ accessRole: "owner", id: "calendar", primary: true, summary: "予定" }],
      canWrite: true,
      googleAccountId: "google-owner",
      ownerId: OWNER.subject,
      primaryCalendarId: "calendar",
      status: "ok",
      visibleCalendarIds: ["calendar"],
    });
    return await ctx.db.insert("externalCalendarEvents", {
      allDay: false,
      calendarId: "calendar",
      connectionId,
      endAt: "2026-08-17 11:00:00",
      googleEventId: "external-event",
      googleUpdated: "2026-08-17T00:00:00Z",
      ownerId: OWNER.subject,
      startAt: "2026-08-17 10:00:00",
      title: "外部予定",
    });
  });

  const listed = await t.query(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: DATE_JST,
    view: "day",
  });
  expect(listed).toMatchObject([{ _id: externalId, canEdit: true }]);

  const other = backend.withIdentity({ subject: "other" });
  expect(
    await other.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: DATE_JST,
      view: "day",
    }),
  ).toEqual([]);
  await expect(
    other.mutation(api.mutations.calendarSync.removeExternal.removeExternal, { externalId }),
  ).rejects.toThrow();
  await expect(
    other.mutation(api.mutations.calendarSync.moveExternal.moveExternal, {
      endAt: "2026-08-17 12:00:00",
      externalId,
      startAt: "2026-08-17 11:00:00",
    }),
  ).rejects.toThrow();

  await t.mutation(api.mutations.calendarSync.removeExternal.removeExternal, { externalId });
  expect(
    await t.query(api.queries.calendarSync.listExternal.listExternal, {
      anchorDateJst: DATE_JST,
      view: "day",
    }),
  ).toEqual([]);
});
