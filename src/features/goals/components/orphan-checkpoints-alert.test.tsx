import { expect, test, vi } from "vite-plus/test";

import {
  ORPHAN_CHECKPOINTS_MESSAGE,
  ORPHAN_CHECKPOINTS_TITLE,
  OrphanCheckpointsAlert,
} from "~/features/goals/components/orphan-checkpoints-alert";
import type { MasteryGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";

const ORPHAN = {
  _id: "goal-orphan" as MasteryGoal["_id"],
  achievedAt: undefined,
  activeDays: 0,
  confirmedMinutes: 0,
  content: "親のない刻み",
  createdAt: 1_755_000_000_000,
  criterion: "できる",
  deadline: "2026-09-06",
  parentGoalId: undefined,
  type: "mastery",
} satisfies MasteryGoal;

const ACHIEVED_ORPHAN = {
  ...ORPHAN,
  _id: "goal-achieved-orphan" as MasteryGoal["_id"],
  achievedAt: "2026-08-09",
  content: "達成済みの親なし",
} satisfies MasteryGoal;

function alertProps(overrides: Partial<Parameters<typeof OrphanCheckpointsAlert>[0]> = {}) {
  return {
    form: undefined,
    onEditGoal: vi.fn(),
    onRemoveGoal: vi.fn(),
    onSetAchieved: vi.fn(),
    orphans: [ORPHAN, ACHIEVED_ORPHAN],
    todayJst: TODAY,
    ...overrides,
  } satisfies Parameters<typeof OrphanCheckpointsAlert>[0];
}

test("親を選び直すよう促し、達成済みの孤児も並べる", () => {
  const { getByText } = renderWithMantine(<OrphanCheckpointsAlert {...alertProps()} />);
  expect(getByText(ORPHAN_CHECKPOINTS_TITLE)).toBeDefined();
  expect(getByText(ORPHAN_CHECKPOINTS_MESSAGE)).toBeDefined();
  expect(getByText(ORPHAN.content)).toBeDefined();
  expect(getByText(ACHIEVED_ORPHAN.content)).toBeDefined();
});

test("孤児が減っても行が入れ替わる(再描画)", () => {
  const view = renderWithMantine(<OrphanCheckpointsAlert {...alertProps()} />);
  view.rerender(<OrphanCheckpointsAlert {...alertProps({ orphans: [ACHIEVED_ORPHAN] })} />);
  expect(view.queryByText(ORPHAN.content)).toBeNull();
  expect(view.getByText(ACHIEVED_ORPHAN.content)).toBeDefined();
});

test("編集フォームは一覧の上に開く", () => {
  const { getByText } = renderWithMantine(
    <OrphanCheckpointsAlert {...alertProps({ form: <div>編集フォーム</div> })} />,
  );
  expect(getByText("編集フォーム")).toBeDefined();
});

test("編集で親を選び直せるよう、行のアクションが呼ばれる", () => {
  const onEditGoal = vi.fn();
  const onRemoveGoal = vi.fn();
  const { getByRole } = renderWithMantine(
    <OrphanCheckpointsAlert {...alertProps({ onEditGoal, onRemoveGoal })} />,
  );
  getByRole("button", { name: `${ORPHAN.content}を編集` }).click();
  getByRole("button", { name: `${ORPHAN.content}を削除` }).click();
  expect(onEditGoal).toHaveBeenCalledWith(ORPHAN);
  expect(onRemoveGoal).toHaveBeenCalledWith(ORPHAN);
});
