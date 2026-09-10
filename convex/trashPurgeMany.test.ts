import { validate } from "convex-helpers/validators";
import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { convexModules } from "../src/test-utils/convex-modules";
import { api, components } from "./_generated/api";
import authSchema from "./betterAuth/schema";
import {
  TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT,
  TRASH_PURGE_SELECTION_LIMIT,
} from "./lib/trashSelection";
import schema from "./schema";

const authModules = import.meta.glob("./betterAuth/**/*.ts");

const OWNER = { email: "trash-owner@example.com", subject: "trash-owner" };
const MONDAY = "2026-08-17";
const TUESDAY = "2026-08-18";

async function owner() {
  const t = convexTest(schema, convexModules);
  t.registerComponent("betterAuth", authSchema, authModules);
  const user = await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        data: {
          createdAt: 0,
          email: OWNER.email,
          emailVerified: true,
          name: "ゴミ箱利用者",
          updatedAt: 0,
        },
        model: "user",
      },
    }),
  );
  if (!validate(authSchema.doc("user"), user)) {
    throw new Error("expected a better-auth user");
  }
  return t.withIdentity({ email: OWNER.email, subject: user._id });
}

async function ownerWithCatalog() {
  const t = await owner();
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  return t;
}

test("重複した日と子記録を一括削除し、予定と日配下の全記録も削除する", async () => {
  const t = await ownerWithCatalog();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  await t.mutation(api.mutations.days.open.open, { dateJst: TUESDAY, todayJst: TUESDAY });
  const monday = await t.query(api.queries.days.get.get, {
    dateJst: MONDAY,
    todayJst: TUESDAY,
  });
  const tuesday = await t.query(api.queries.days.get.get, {
    dateJst: TUESDAY,
    todayJst: TUESDAY,
  });
  const mondayRow = monday.rows[0];
  const mondaySibling = monday.rows[1];
  const tuesdayRow = tuesday.rows[0];
  if (
    monday.day === null ||
    tuesday.day === null ||
    mondayRow === undefined ||
    mondaySibling === undefined ||
    tuesdayRow === undefined
  ) {
    throw new Error("expected days and rows");
  }
  const mondayDay = monday.day;
  const tuesdayDay = tuesday.day;

  const mondayBlockId = await t.mutation(api.mutations.boardSchedule.create.create, {
    color: "green",
    endAt: "2026-08-17 10:00:00",
    rowId: mondayRow._id,
    startAt: "2026-08-17 09:00:00",
  });
  const tuesdayBlockId = await t.mutation(api.mutations.boardSchedule.create.create, {
    color: "blue",
    endAt: "2026-08-18 10:00:00",
    rowId: tuesdayRow._id,
    startAt: "2026-08-18 09:00:00",
  });
  await t.run(async (ctx) => {
    await ctx.db.patch("rows", mondayRow._id, { deletedAt: 1 });
    await ctx.db.patch("rows", tuesdayRow._id, { deletedAt: 1 });
  });
  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });

  const result = await t.mutation(api.mutations.trash.purgeMany.purgeMany, {
    dayIds: [mondayDay._id, mondayDay._id],
    rowIds: [mondayRow._id, mondayRow._id, tuesdayRow._id, tuesdayRow._id],
  });

  expect(result).toBeNull();
  const remaining = await t.run(async (ctx) =>
    Promise.all([
      ctx.db.get("days", mondayDay._id),
      ctx.db.get("days", tuesdayDay._id),
      ctx.db.get("rows", mondayRow._id),
      ctx.db.get("rows", mondaySibling._id),
      ctx.db.get("rows", tuesdayRow._id),
      ctx.db.get("boardScheduleEvents", mondayBlockId),
      ctx.db.get("boardScheduleEvents", tuesdayBlockId),
    ]),
  );
  expect(remaining).toEqual([null, expect.anything(), null, null, null, null, null]);
});

test("日を選ばずに指定した記録だけを完全削除する", async () => {
  const t = await ownerWithCatalog();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const page = await t.query(api.queries.days.get.get, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  const row = page.rows[0];
  const sibling = page.rows[1];
  if (page.day === null || row === undefined || sibling === undefined) {
    throw new Error("expected a day and rows");
  }
  const day = page.day;
  await t.run((ctx) => ctx.db.patch("rows", row._id, { deletedAt: 1 }));

  await t.mutation(api.mutations.trash.purgeMany.purgeMany, {
    dayIds: [],
    rowIds: [row._id],
  });

  const remaining = await t.run(async (ctx) =>
    Promise.all([
      ctx.db.get("days", day._id),
      ctx.db.get("rows", row._id),
      ctx.db.get("rows", sibling._id),
    ]),
  );
  expect(remaining).toEqual([expect.anything(), null, expect.anything()]);
  await expect(
    t.mutation(api.mutations.trash.purgeMany.purgeMany, {
      dayIds: [],
      rowIds: [row._id],
    }),
  ).rejects.toThrow();
});

test("個別の記録を完全削除したときも残存する予定を削除する", async () => {
  const t = await ownerWithCatalog();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const page = await t.query(api.queries.days.get.get, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  const row = page.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }
  const blockId = await t.mutation(api.mutations.boardSchedule.create.create, {
    color: "green",
    endAt: "2026-08-17 10:00:00",
    rowId: row._id,
    startAt: "2026-08-17 09:00:00",
  });
  await t.run((ctx) => ctx.db.patch("rows", row._id, { deletedAt: 1 }));

  await t.mutation(api.mutations.trash.purgeRow.purgeRow, { rowId: row._id });

  expect(await t.run((ctx) => ctx.db.get("rows", row._id))).toBeNull();
  expect(await t.run((ctx) => ctx.db.get("boardScheduleEvents", blockId))).toBeNull();
});

test("他ユーザーまたはゴミ箱外の対象が混ざると全件をロールバックする", async () => {
  const t = await ownerWithCatalog();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const page = await t.query(api.queries.days.get.get, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  const activeRow = page.rows[0];
  if (page.day === null || activeRow === undefined) {
    throw new Error("expected a day and row");
  }
  const day = page.day;
  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });
  const foreignDayId = await t.run((ctx) =>
    ctx.db.insert("days", {
      dateJst: TUESDAY,
      deletedAt: 1,
      ownerId: "another-owner",
    }),
  );
  const foreignRowId = await t.run((ctx) =>
    ctx.db.insert("rows", {
      content: "foreign",
      dateJst: TUESDAY,
      dayId: foreignDayId,
      deletedAt: 1,
      itemId: activeRow.itemId,
      minutes: 30,
      ownerId: "another-owner",
      sortOrder: 0,
      status: activeRow.status,
    }),
  );

  await expect(
    t.mutation(api.mutations.trash.purgeMany.purgeMany, {
      dayIds: [day._id, foreignDayId],
      rowIds: [],
    }),
  ).rejects.toThrow();
  expect(await t.run((ctx) => ctx.db.get("days", day._id))).not.toBeNull();

  await expect(
    t.mutation(api.mutations.trash.purgeMany.purgeMany, {
      dayIds: [day._id],
      rowIds: [foreignRowId],
    }),
  ).rejects.toThrow();
  expect(await t.run((ctx) => ctx.db.get("days", day._id))).not.toBeNull();

  await expect(
    t.mutation(api.mutations.trash.purgeMany.purgeMany, {
      dayIds: [day._id],
      rowIds: [activeRow._id],
    }),
  ).rejects.toThrow();
  expect(await t.run((ctx) => ctx.db.get("days", day._id))).not.toBeNull();
});

test("未認証の一括完全削除は拒否する", async () => {
  const t = convexTest(schema, convexModules);
  await expect(
    t.mutation(api.mutations.trash.purgeMany.purgeMany, { dayIds: [], rowIds: [] }),
  ).rejects.toThrow();
});

test("一括完全削除の上限を超えた場合は削除しない", async () => {
  const t = await owner();
  const dayIds = await t.run((ctx) =>
    Promise.all(
      Array.from({ length: TRASH_PURGE_SELECTION_LIMIT + 1 }, (_, index) =>
        ctx.db.insert("days", {
          dateJst: `2026-01-${String(index + 1).padStart(2, "0")}`,
          deletedAt: 1,
          ownerId: OWNER.subject,
        }),
      ),
    ),
  );
  const firstDayId = dayIds[0];
  if (firstDayId === undefined) {
    throw new Error("expected a day");
  }

  await expect(
    t.mutation(api.mutations.trash.purgeMany.purgeMany, { dayIds, rowIds: [] }),
  ).rejects.toThrow();
  expect(await t.run((ctx) => ctx.db.get("days", firstDayId))).not.toBeNull();
});

test("選択した日の配下を含めて削除上限を超える場合は削除しない", async () => {
  const t = await ownerWithCatalog();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const page = await t.query(api.queries.days.get.get, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  const template = page.rows[0];
  if (page.day === null || template === undefined) {
    throw new Error("expected a day and row");
  }
  const day = page.day;
  await t.run((ctx) =>
    Promise.all(
      Array.from({ length: TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT }, (_, index) =>
        ctx.db.insert("rows", {
          content: `row ${index}`,
          dateJst: MONDAY,
          dayId: day._id,
          deletedAt: 1,
          itemId: template.itemId,
          minutes: 1,
          ownerId: OWNER.subject,
          sortOrder: index,
          status: template.status,
        }),
      ),
    ),
  );
  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });

  await expect(
    t.mutation(api.mutations.trash.purgeMany.purgeMany, {
      dayIds: [day._id],
      rowIds: [],
    }),
  ).rejects.toThrow();
  expect(await t.run((ctx) => ctx.db.get("days", day._id))).not.toBeNull();
});
