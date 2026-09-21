import { expect, test } from "vite-plus/test";

import type { Doc } from "../../_generated/dataModel";
import {
  externalChangePayload,
  goalEventPayload,
  patchPayload,
  payloadKey,
  planEventPayload,
} from "./eventPayload";

const event = {
  dateJst: "2026-08-17",
  endMinute: 630,
  priority: "high" as const,
  startMinute: 540,
  title: "公式問題集 Part 7",
};

test.each([
  { colorId: "5", priority: "high" as const },
  { colorId: "2", priority: "medium" as const },
  { colorId: "8", priority: "low" as const },
])("priority $priority は Google 色 $colorId だけを使う", ({ colorId, priority }) => {
  expect(planEventPayload({ ...event, priority }, { itemName: "", note: "" }).colorId).toBe(
    colorId,
  );
});

test("予定の題名が summary で、説明は項目名とひとことだけを持つ", () => {
  expect(planEventPayload(event, { itemName: "多読", note: "Chapter 3" })).toEqual({
    colorId: "5",
    description: "多読 / Chapter 3",
    end: { dateTime: "2026-08-17T10:30:00+09:00" },
    start: { dateTime: "2026-08-17T09:00:00+09:00" },
    summary: "公式問題集 Part 7",
    transparency: "opaque",
  });
});

test("項目なし予定は説明が空でも Google に出る", () => {
  expect(planEventPayload(event, { itemName: "", note: "" })).toMatchObject({
    description: "",
    summary: "公式問題集 Part 7",
  });
});

test("24:00 終了は翌日 00:00 の RFC3339 になる", () => {
  expect(
    planEventPayload({ ...event, endMinute: 1440, startMinute: 1380 }, { itemName: "", note: "" })
      .end,
  ).toEqual({ dateTime: "2026-08-18T00:00:00+09:00" });
});

test("時刻だけが変わっても payloadKey は変わる（送信の要否を start / end で判定できる）", () => {
  const before = payloadKey(planEventPayload(event, { itemName: "", note: "" }));
  const after = payloadKey(
    planEventPayload({ ...event, startMinute: 570 }, { itemName: "", note: "" }),
  );
  expect(after).not.toBe(before);
  expect(before).toContain("2026-08-17T09:00:00+09:00");
});

test("本番日・未達成の期限は終日の「空き」、それ以外は載せない", () => {
  const exam = {
    _creationTime: 0,
    _id: "exam" as Doc<"goals">["_id"],
    content: "本番で900点を取る",
    examDate: "2026-10-01",
    maxScore: 900,
    minScore: 800,
    ownerId: "owner",
    type: "exam" as const,
  } satisfies Doc<"goals">;
  expect(goalEventPayload(exam, null)).toEqual({
    description: "目標 800〜900",
    end: { date: "2026-10-02" },
    start: { date: "2026-10-01" },
    summary: "本番: 本番で900点を取る",
    transparency: "transparent",
  });
  expect(
    goalEventPayload({ ...exam, result: { recordedAt: "2026-10-05", score: 855 } }, null),
  ).toBeNull();

  const checkpoint = {
    _creationTime: 0,
    _id: "cp" as Doc<"goals">["_id"],
    activeDays: 0,
    confirmedMinutes: 0,
    content: "Unit 1-10 を音読",
    criterion: "止まらずに読める",
    deadline: "2026-09-30",
    ownerId: "owner",
    parentGoalId: exam._id,
    type: "mastery" as const,
  } satisfies Doc<"goals">;
  expect(goalEventPayload(checkpoint, exam)?.description).toBe(
    "本番で900点を取る / 止まらずに読める",
  );
  expect(goalEventPayload({ ...checkpoint, achievedAt: "2026-09-20" }, exam)).toBeNull();
  expect(
    goalEventPayload({ ...checkpoint, deadline: undefined, parentGoalId: undefined }, null),
  ).toBeNull();
});

test("外部予定の移動は、終日なら date（終端は翌日）、時刻つきなら dateTime で送る", () => {
  expect(
    externalChangePayload({
      allDay: true,
      endAt: "2026-08-19 23:59:59",
      kind: "move",
      startAt: "2026-08-18 00:00:00",
    }),
  ).toEqual({
    end: { date: "2026-08-20", dateTime: null },
    start: { date: "2026-08-18", dateTime: null },
  });
  expect(
    externalChangePayload({
      allDay: false,
      endAt: "2026-08-18 11:00:00",
      kind: "move",
      startAt: "2026-08-18 10:00:00",
    }),
  ).toEqual({
    end: { date: null, dateTime: "2026-08-18T11:00:00+09:00" },
    start: { date: null, dateTime: "2026-08-18T10:00:00+09:00" },
  });
});

test("payloadKey はキーの並び順に依らず同じ内容なら同じ値になる", () => {
  const payload = planEventPayload(event, { itemName: "", note: "" });
  const reordered = {
    transparency: payload.transparency,
    summary: payload.summary,
    start: payload.start,
    end: payload.end,
    description: payload.description,
    colorId: payload.colorId,
  };
  expect(payloadKey(reordered)).toBe(payloadKey(payload));
  expect(payloadKey({ ...payload, colorId: undefined })).toBe(
    payloadKey({ ...payload, colorId: undefined }),
  );
});

test("patch は date / dateTime の使わない方を null で送り、終日⇄時刻の切替を Google に伝える", () => {
  const timed = patchPayload(planEventPayload(event, { itemName: "", note: "" }));
  expect(timed.start).toEqual({ date: null, dateTime: "2026-08-17T09:00:00+09:00" });
  expect(timed.end).toEqual({ date: null, dateTime: "2026-08-17T10:30:00+09:00" });
  expect(JSON.stringify(timed)).toContain(
    '"start":{"date":null,"dateTime":"2026-08-17T09:00:00+09:00"}',
  );

  const allDay = externalChangePayload({
    allDay: true,
    endAt: "2026-08-18 00:00:00",
    kind: "move",
    startAt: "2026-08-17 00:00:00",
  });
  expect(allDay.start).toEqual({ date: "2026-08-17", dateTime: null });
  expect(allDay.end).toEqual({ date: "2026-08-19", dateTime: null });
});
