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
const MONDAY = "2026-08-17";

function owner() {
  return convexTest(schema, modules).withIdentity(OWNER);
}

async function ownerWithDay() {
  const t = owner();
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  return t;
}

test("boardScheduleEvents を作成・週一覧・更新・削除できる", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }

  const blockId = await t.mutation(api.mutations.boardSchedule.create.create, {
    color: "green",
    endAt: "2026-08-17 10:30:00",
    rowId: row._id,
    startAt: "2026-08-17 09:00:00",
  });

  const listed = await t.query(api.queries.boardSchedule.listForWeek.listForWeek, {
    anchorDateJst: MONDAY,
    view: "week",
  });
  expect(listed).toEqual([
    {
      _id: blockId,
      color: "green",
      endAt: "2026-08-17 10:30:00",
      rowId: row._id,
      startAt: "2026-08-17 09:00:00",
      title: row.itemName,
    },
  ]);

  await t.mutation(api.mutations.boardSchedule.update.update, {
    blockId,
    color: "violet",
    endAt: "2026-08-17 11:00:00",
    startAt: "2026-08-17 09:30:00",
  });

  const secondRow = day.rows[1];
  if (secondRow === undefined) {
    throw new Error("expected a second row");
  }
  await t.mutation(api.mutations.boardSchedule.update.update, {
    blockId,
    endAt: "2026-08-17 11:00:00",
    rowId: secondRow._id,
    startAt: "2026-08-17 09:30:00",
  });

  expect(
    await t.query(api.queries.boardSchedule.listForWeek.listForWeek, {
      anchorDateJst: MONDAY,
      view: "week",
    }),
  ).toEqual([
    {
      _id: blockId,
      color: "violet",
      endAt: "2026-08-17 11:00:00",
      rowId: secondRow._id,
      startAt: "2026-08-17 09:30:00",
      title: secondRow.itemName,
    },
  ]);

  await t.mutation(api.mutations.boardSchedule.move.move, {
    blockId,
    endAt: "2026-08-18 11:00:00",
    startAt: "2026-08-18 09:30:00",
  });

  await t.mutation(api.mutations.boardSchedule.remove.remove, { blockId });

  expect(
    await t.query(api.queries.boardSchedule.listForWeek.listForWeek, {
      anchorDateJst: MONDAY,
      view: "week",
    }),
  ).toEqual([]);
});

test("月表示はアンカー週の外にある予定も返す", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }

  const blockId = await t.mutation(api.mutations.boardSchedule.create.create, {
    color: "green",
    endAt: "2026-08-15 10:30:00",
    rowId: row._id,
    startAt: "2026-08-15 09:00:00",
  });

  const weekListed = await t.query(api.queries.boardSchedule.listForWeek.listForWeek, {
    anchorDateJst: "2026-08-01",
    view: "week",
  });
  expect(weekListed).toEqual([]);

  const monthListed = await t.query(api.queries.boardSchedule.listForWeek.listForWeek, {
    anchorDateJst: "2026-08-01",
    view: "month",
  });
  expect(monthListed).toEqual([
    {
      _id: blockId,
      color: "green",
      endAt: "2026-08-15 10:30:00",
      rowId: row._id,
      startAt: "2026-08-15 09:00:00",
      title: row.itemName,
    },
  ]);
});

test("スキップした記録は unskip で未着手に戻せる", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }

  await t.mutation(api.mutations.rows.skip.skip, { rowId: row._id });
  await t.mutation(api.mutations.rows.unskip.unskip, { rowId: row._id });

  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.rows.find((candidate) => candidate._id === row._id)?.status).toBe("未着手");
});

test("未着手の記録に unskip は失敗する", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }

  await expect(t.mutation(api.mutations.rows.unskip.unskip, { rowId: row._id })).rejects.toThrow();
});

test("applyOrder でカンバン列の並べ替えを保存できる", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  if (day.rows.length < 2) {
    throw new Error("expected at least two rows");
  }
  const reversed = [...day.rows].reverse().map((row) => row._id);

  await t.mutation(api.mutations.rows.applyOrder.applyOrder, {
    dateJst: MONDAY,
    orderedRowIds: reversed,
  });

  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.rows.map((row) => row._id)).toEqual(reversed);
});

test("ゴミ箱に入れた記録の boardScheduleEvents は削除される", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }

  const blockId = await t.mutation(api.mutations.boardSchedule.create.create, {
    color: "green",
    endAt: "2026-08-17 10:30:00",
    rowId: row._id,
    startAt: "2026-08-17 09:00:00",
  });

  await t.mutation(api.mutations.rows.remove.remove, { rowId: row._id });

  expect(
    await t.query(api.queries.boardSchedule.listForWeek.listForWeek, {
      anchorDateJst: MONDAY,
      view: "week",
    }),
  ).toEqual([]);

  await expect(
    t.mutation(api.mutations.boardSchedule.update.update, {
      blockId,
      color: "red",
      endAt: "2026-08-17 11:00:00",
      startAt: "2026-08-17 09:30:00",
    }),
  ).rejects.toThrow();
});

test("ゴミ箱の日を完全削除すると、配下の記録の boardScheduleEvents も一緒に消える", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }

  await t.mutation(api.mutations.boardSchedule.create.create, {
    color: "green",
    endAt: "2026-08-17 10:30:00",
    rowId: row._id,
    startAt: "2026-08-17 09:00:00",
  });

  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });
  const trashedDay = (await t.query(api.queries.trash.list.list, {})).days.find(
    (entry) => entry.dateJst === MONDAY,
  );
  if (trashedDay === undefined) {
    throw new Error("expected the day to be trashed");
  }

  await t.mutation(api.mutations.trash.purgeDay.purgeDay, { dayId: trashedDay._id });

  const remainingBlocks = await t.run(async (ctx) =>
    ctx.db
      .query("boardScheduleEvents")
      .withIndex("by_row", (q) => q.eq("rowId", row._id))
      .collect(),
  );
  expect(remainingBlocks).toEqual([]);
});

test("switchPreset で消える未着手の記録は boardScheduleEvents も一緒に消える", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }

  await t.mutation(api.mutations.boardSchedule.create.create, {
    color: "green",
    endAt: "2026-08-17 10:30:00",
    rowId: row._id,
    startAt: "2026-08-17 09:00:00",
  });

  //? catalog.ensure が全曜日のプリセットを配るため新規作成は Conflict になる。
  //? 別曜日の既存プリセットへ切り替えれば未着手の記録は消えるので、それで十分。
  const presets = await t.query(api.queries.presets.list.list, {});
  const otherPreset = presets.find((preset) => preset.weekday !== 1);
  if (otherPreset === undefined) {
    throw new Error("expected another weekday preset");
  }
  const presetId = otherPreset._id;

  await t.mutation(api.mutations.rows.switchPreset.switchPreset, {
    dateJst: MONDAY,
    presetId,
    todayJst: MONDAY,
  });

  const remainingBlocks = await t.run(async (ctx) =>
    ctx.db
      .query("boardScheduleEvents")
      .withIndex("by_row", (q) => q.eq("rowId", row._id))
      .collect(),
  );
  expect(remainingBlocks).toEqual([]);
});
