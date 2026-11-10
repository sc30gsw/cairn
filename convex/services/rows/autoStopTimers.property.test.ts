import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { convexModules } from "../../../src/test-utils/convex-modules";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { Status } from "../../lib/domain";
import { TIMER_MAX_SEGMENT_MS } from "../../lib/rowTimer";
import schema from "../../schema";

const OWNER = "owner-subject";
const STARTED_AT = 1_000;
const NOW = STARTED_AT + TIMER_MAX_SEGMENT_MS;

test("自動停止は期限の来た進行中だけを止め、確定とゴミ箱と未了の計測は触らない", async () => {
  const t = convexTest(schema, convexModules);
  const ids = await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "語彙",
      ownerId: OWNER,
      sortOrder: 0,
    });
    const itemId = await ctx.db.insert("items", {
      categoryId,
      name: "金フレ",
      ownerId: OWNER,
      sortOrder: 0,
    });
    const dayId = await ctx.db.insert("days", { dateJst: "2026-08-17", ownerId: OWNER });
    const insert = (
      status: Status,
      sortOrder: number,
      extra: { deletedAt?: number; timerAccumulatedMs?: number; timerStartedAt?: number },
    ) =>
      ctx.db.insert("rows", {
        content: status,
        dateJst: "2026-08-17",
        dayId,
        itemId,
        minutes: 30,
        ownerId: OWNER,
        sortOrder,
        status,
        ...extra,
      });
    return {
      confirmedId: await insert("確定", 0, { timerStartedAt: STARTED_AT }),
      deletedId: await insert("進行中", 1, { deletedAt: 4, timerStartedAt: STARTED_AT }),
      dueId: await insert("進行中", 2, { timerAccumulatedMs: 5, timerStartedAt: STARTED_AT }),
      freshId: await insert("進行中", 3, { timerStartedAt: NOW - 60_000 }),
    };
  });

  await t.mutation(internal.mutations.rows.autoStopTimers.autoStopTimers, { now: NOW });

  const doc = async (rowId: Id<"rows">) => {
    const row = await t.run(async (ctx) => ctx.db.get("rows", rowId));
    if (row === null) {
      throw new Error("row missing");
    }
    return row;
  };
  const due = await doc(ids.dueId);
  expect(due.status).toBe("進行中");
  expect(due.timerStartedAt).toBeUndefined();
  expect(due.timerAutoStoppedAt).toBe(NOW);
  expect(due.timerAccumulatedMs).toBe(5 + TIMER_MAX_SEGMENT_MS);
  const confirmed = await doc(ids.confirmedId);
  expect(confirmed.status).toBe("確定");
  expect(confirmed.timerStartedAt).toBe(STARTED_AT);
  const deleted = await doc(ids.deletedId);
  expect(deleted.deletedAt).toBe(4);
  expect(deleted.timerStartedAt).toBe(STARTED_AT);
  const fresh = await doc(ids.freshId);
  expect(fresh.status).toBe("進行中");
  expect(fresh.timerStartedAt).toBe(NOW - 60_000);
  expect(fresh.timerAutoStoppedAt).toBeUndefined();
});
