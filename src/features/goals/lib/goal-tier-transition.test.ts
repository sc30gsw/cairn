import { expect, test } from "vite-plus/test";

import {
  GOAL_UPDATED_MESSAGE,
  tierTransition,
  tierTransitionAlert,
  tierTransitionToast,
} from "~/features/goals/lib/goal-tier-transition";

test("期限を外すと長期目標への移行になる", () => {
  expect(
    tierTransition({
      after: { deadline: "", parentGoalId: "" },
      before: { deadline: "2026-09-06", parentGoalId: "parent" },
    }),
  ).toBe("toLongTerm");
});

test("期限を付けるとチェックポイントへの移行になる", () => {
  expect(
    tierTransition({
      after: { deadline: "2026-09-06", parentGoalId: "parent" },
      before: { deadline: undefined, parentGoalId: undefined },
    }),
  ).toBe("toCheckpoint");
});

test("期限を持ったまま親が変わると付け替えになる", () => {
  expect(
    tierTransition({
      after: { deadline: "2026-09-06", parentGoalId: "next" },
      before: { deadline: "2026-09-06", parentGoalId: "current" },
    }),
  ).toBe("reparent");
});

test("親も期限も変わらなければ移行しない", () => {
  expect(
    tierTransition({
      after: { deadline: "2026-09-13", parentGoalId: "parent" },
      before: { deadline: "2026-09-06", parentGoalId: "parent" },
    }),
  ).toBe("none");
});

test("ライブ予告は行き先を出し、親名が引けない移行は黙る", () => {
  expect(tierTransitionAlert("toLongTerm", undefined)).toBe(
    "保存すると期限が外れ、長期目標へ移ります",
  );
  expect(tierTransitionAlert("toCheckpoint", "本番目標")).toBe(
    "保存すると『本番目標』のチェックポイントになります",
  );
  expect(tierTransitionAlert("reparent", "長期目標")).toBe("保存すると『長期目標』の下へ移ります");
  expect(tierTransitionAlert("toCheckpoint", undefined)).toBeUndefined();
  expect(tierTransitionAlert("none", "本番目標")).toBeUndefined();
});

test("保存後トーストは行き先を出し、移行が無ければ既存の文言に戻る", () => {
  expect(tierTransitionToast("toLongTerm", undefined)).toBe("長期目標に移しました");
  expect(tierTransitionToast("toCheckpoint", "本番目標")).toBe(
    "『本番目標』のチェックポイントにしました",
  );
  expect(tierTransitionToast("reparent", "長期目標")).toBe("『長期目標』の下へ移しました");
  expect(tierTransitionToast("none", "本番目標")).toBe(GOAL_UPDATED_MESSAGE);
  expect(tierTransitionToast("reparent", undefined)).toBe(GOAL_UPDATED_MESSAGE);
});
