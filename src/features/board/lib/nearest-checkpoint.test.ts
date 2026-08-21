import { expect, test } from "vite-plus/test";

import { nearestCheckpoint } from "~/features/board/lib/nearest-checkpoint";
import type { BoardGoal } from "~/features/board/types/board";

function mastery(id: string, deadline: string, achievedAt?: string): BoardGoal {
  return {
    _id: id as BoardGoal["_id"],
    achievedAt,
    activeDays: 0,
    confirmedMinutes: 0,
    content: `${id}の内容`,
    criterion: "できる",
    deadline,
    type: "mastery",
  };
}

test("今日以降で最も近い未達成を返す", () => {
  const found = nearestCheckpoint(
    [mastery("g1", "2026-08-20"), mastery("g2", "2026-08-18"), mastery("g3", "2026-08-25")],
    "2026-08-17",
  );
  expect(found?._id).toBe("g2");
});

test("今日以降が無ければ直近の期限超過を返す", () => {
  const found = nearestCheckpoint(
    [mastery("g1", "2026-08-10"), mastery("g2", "2026-08-15")],
    "2026-08-17",
  );
  expect(found?._id).toBe("g2");
});

test("達成済みと試験は除外する", () => {
  const exam: BoardGoal = {
    _id: "exam" as BoardGoal["_id"],
    content: "TOEIC",
    examDate: "2026-09-01",
    maxScore: 900,
    minScore: 800,
    type: "exam",
  };
  expect(
    nearestCheckpoint([exam, mastery("done", "2026-08-20", "2026-08-16")], "2026-08-17"),
  ).toBeNull();
});
