import { expect, test } from "vite-plus/test";

import type { ActionCtx } from "../../_generated/server";
import type { PulledEvent } from "../../lib/validators";
import { applyPulledEventsInOrder } from "./applyPulledEventsInOrder";

type Applied = { events: PulledEvent[]; finish: unknown };

function recordingCtx() {
  const applied: Applied[] = [];
  const started: number[] = [];
  const finished: number[] = [];
  const ctx = {
    runMutation: async (_reference: unknown, args: unknown) => {
      applied.push(args as Applied);
      started.push(applied.length);
      await Promise.resolve();
      finished.push(applied.length);
      return null;
    },
  } as unknown as Pick<ActionCtx, "runMutation">;
  return { applied, ctx, finished, started };
}

function deletion(id: string): PulledEvent {
  return { calendarId: "primary", googleEventId: id, kind: "delete" };
}

const finish = { keepEventIds: ["a", "b", "c"], syncToken: "token-1" };

test("取り込みは塊ごとに順番どおりに適用し、差分トークンの保存は最後の塊だけが持つ", async () => {
  const { applied, ctx, finished, started } = recordingCtx();

  await applyPulledEventsInOrder(
    ctx,
    {
      calendarId: "primary",
      events: [deletion("a"), deletion("b"), deletion("c")],
      finish,
      ownerId: "owner",
      todayJst: "2026-08-17",
    },
    2,
  );

  expect(applied.map((call) => call.events.map((event) => event.googleEventId))).toEqual([
    ["a", "b"],
    ["c"],
  ]);
  expect(applied.map((call) => call.finish)).toEqual([null, finish]);
  expect(started).toEqual([1, 2]);
  expect(finished).toEqual([1, 2]);
});

test("取り込む予定が無くても 1 回は呼び、差分トークンと写しの整理を確実に行う", async () => {
  const { applied, ctx } = recordingCtx();

  await applyPulledEventsInOrder(
    ctx,
    { calendarId: "primary", events: [], finish, ownerId: "owner", todayJst: "2026-08-17" },
    2,
  );

  expect(applied).toHaveLength(1);
  expect(applied[0]?.finish).toEqual(finish);
});
