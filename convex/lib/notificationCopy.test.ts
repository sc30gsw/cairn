import { expect, test } from "vite-plus/test";

import type { Id } from "../_generated/dataModel";
import { TARGET_METRIC_UNITS } from "./domain";
import { notificationMessage } from "./notificationCopy";
import { NOTIFICATION_BODY_LINE_LIMIT } from "./notifications";

function goalId(value: string): Id<"goals"> {
  return value as Id<"goals">;
}

function deadlineItem(content: string, daysLeft: number) {
  return { content, daysLeft, deadline: "2026-08-23", goalId: goalId(`goal-${content}`) };
}

test("期限接近の本文は残り日数を並べ、当日は「今日まで」になる", () => {
  const { body, title } = notificationMessage({
    dateJst: "2026-08-20",
    items: [deadlineItem("音読を1周", 0), deadlineItem("文法を復習", 2)],
    kind: "checkpointDeadline",
  });

  expect(title).toBe("チェックポイントの期限が近づいています");
  expect(body).toBe("・音読を1周（今日まで / 2026-08-23）\n・文法を復習（あと2日 / 2026-08-23）");
});

test("明細が6件以上のときは先頭5行だけ並べ、残りを「…他N件」に畳む", () => {
  const items = Array.from({ length: 6 }, (_, index) =>
    deadlineItem(`項目${String(index)}`, index),
  );
  const { body } = notificationMessage({
    dateJst: "2026-08-20",
    items,
    kind: "checkpointDeadline",
  });
  const lines = body.split("\n");

  expect(lines).toHaveLength(NOTIFICATION_BODY_LINE_LIMIT + 1);
  expect(lines.at(-1)).toBe("…他1件");
  expect(lines[0]).toContain("項目0");
  expect(lines[4]).toContain("項目4");
});

test("週間ターゲット未達の本文は残り量と単位を出す", () => {
  const { body, title } = notificationMessage({
    kind: "weeklyTargetMiss",
    shortfalls: [
      { categoryName: "TOEIC対策", current: 60, metric: "minutes", targetValue: 180 },
      { categoryName: "多読", current: 2, metric: "days", targetValue: 4 },
      { categoryName: "英会話", current: 1, metric: "count", targetValue: 3 },
    ],
    weekStartJst: "2026-08-17",
  });

  expect(title).toBe("今週の週間ターゲットが未達です");
  expect(body).toBe(
    `・TOEIC対策 あと120${TARGET_METRIC_UNITS.minutes}\n・多読 あと2${TARGET_METRIC_UNITS.days}\n・英会話 あと2${TARGET_METRIC_UNITS.count}`,
  );
});

test("夜の催促は日ありとプリセットで文言が変わる", () => {
  expect(
    notificationMessage({
      dateJst: "2026-08-20",
      kind: "eveningUntouched",
      pendingCount: 2,
      source: "day",
    }),
  ).toEqual({ body: "未着手が2件残っています。", title: "今日の残りがあります" });

  expect(
    notificationMessage({
      dateJst: "2026-08-20",
      kind: "eveningUntouched",
      pendingCount: 3,
      source: "preset",
    }),
  ).toEqual({
    body: "今日はまだ開いていません。今日のプリセットに3件あります。",
    title: "今日の残りがあります",
  });
});
