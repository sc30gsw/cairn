import { expect, test, vi } from "vite-plus/test";

import {
  CHECKPOINT_EMPTY_MESSAGE,
  CHECKPOINT_SECTION_TITLE,
  CheckpointSection,
} from "~/features/goals/components/checkpoint-section";
import type { MasteryGoal } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const TODAY = "2026-08-17";

const CHECKPOINT = {
  _id: "goal-checkpoint" as MasteryGoal["_id"],
  achievedAt: undefined,
  activeDays: 4,
  confirmedMinutes: 180,
  content: "Unit 1-10 を音読する",
  criterion: "Unit 1-10 を止まらずに音読できる",
  deadline: "2026-08-23",
  type: "mastery",
} satisfies MasteryGoal;

const ACHIEVED = {
  ...CHECKPOINT,
  _id: "goal-achieved" as MasteryGoal["_id"],
  achievedAt: "2026-08-09",
} satisfies MasteryGoal;

function sectionProps(overrides: Partial<Parameters<typeof CheckpointSection>[0]> = {}) {
  return {
    achieved: [],
    checkpoints: [],
    form: null,
    onAddCheckpoint: vi.fn(),
    onEditGoal: vi.fn(),
    onRemoveGoal: vi.fn(),
    onSetAchieved: vi.fn(),
    todayJst: TODAY,
    ...overrides,
  };
}

test("form が渡されたらセクション内に描画する", () => {
  const { getByText } = renderWithMantine(
    <CheckpointSection {...sectionProps({ form: <div>追加フォーム</div> })} />,
  );
  expect(getByText("追加フォーム")).toBeDefined();
});

test("チェックポイントがあるとき空メッセージは出ない", () => {
  const { queryByText } = renderWithMantine(
    <CheckpointSection {...sectionProps({ checkpoints: [CHECKPOINT] })} />,
  );
  expect(queryByText(CHECKPOINT_EMPTY_MESSAGE)).toBeNull();
});

test("チェックポイントが無いとき空メッセージを出す", () => {
  const { getByText } = renderWithMantine(<CheckpointSection {...sectionProps()} />);
  expect(getByText(CHECKPOINT_EMPTY_MESSAGE)).toBeDefined();
});

test("追加導線が無いときボタンを出さない", () => {
  const { queryByRole } = renderWithMantine(
    <CheckpointSection {...sectionProps({ onAddCheckpoint: undefined })} />,
  );
  expect(queryByRole("button", { name: "チェックポイントを追加" })).toBeNull();
});

test("追加ボタンで onAddCheckpoint が呼ばれる", () => {
  const onAddCheckpoint = vi.fn();
  const { getByRole } = renderWithMantine(
    <CheckpointSection {...sectionProps({ onAddCheckpoint })} />,
  );
  getByRole("button", { name: "チェックポイントを追加" }).click();
  expect(onAddCheckpoint).toHaveBeenCalledOnce();
});

test("チェックポイントカードの編集と削除が親ハンドラに渡る", () => {
  const onEditGoal = vi.fn();
  const onRemoveGoal = vi.fn();
  const { getByRole } = renderWithMantine(
    <CheckpointSection
      {...sectionProps({ checkpoints: [CHECKPOINT], onEditGoal, onRemoveGoal })}
    />,
  );
  getByRole("button", { name: `${CHECKPOINT.content}を編集` }).click();
  getByRole("button", { name: `${CHECKPOINT.content}を削除` }).click();
  expect(onEditGoal).toHaveBeenCalledWith(CHECKPOINT);
  expect(onRemoveGoal).toHaveBeenCalledWith(CHECKPOINT._id);
});

test("達成済みがあれば件数つきのアコーディオンを出す", () => {
  const { getByRole } = renderWithMantine(
    <CheckpointSection {...sectionProps({ achieved: [ACHIEVED] })} />,
  );
  expect(getByRole("button", { name: "達成済み（1件）" })).toBeDefined();
  expect(getByRole("region", { name: CHECKPOINT_SECTION_TITLE })).toBeDefined();
});

test("チェックポイントの達成チェックで onSetAchieved が呼ばれる", () => {
  const onSetAchieved = vi.fn();
  const { getByRole } = renderWithMantine(
    <CheckpointSection {...sectionProps({ checkpoints: [CHECKPOINT], onSetAchieved })} />,
  );
  getByRole("checkbox", { name: `${CHECKPOINT.content}の達成` }).click();
  expect(onSetAchieved).toHaveBeenCalledWith({
    achievedAt: TODAY,
    goalId: CHECKPOINT._id,
  });
});

test("達成済みアコーディオン内のチェックで達成取消が呼ばれる", () => {
  const onSetAchieved = vi.fn();
  const { getByRole } = renderWithMantine(
    <CheckpointSection {...sectionProps({ achieved: [ACHIEVED], onSetAchieved })} />,
  );
  getByRole("checkbox", { name: `${ACHIEVED.content}の達成` }).click();
  expect(onSetAchieved).toHaveBeenCalledWith({
    achievedAt: undefined,
    goalId: ACHIEVED._id,
  });
});

test("達成済みアコーディオン内の編集と削除が親ハンドラに渡る", () => {
  const onEditGoal = vi.fn();
  const onRemoveGoal = vi.fn();
  const { getByRole } = renderWithMantine(
    <CheckpointSection {...sectionProps({ achieved: [ACHIEVED], onEditGoal, onRemoveGoal })} />,
  );
  getByRole("button", { name: `${ACHIEVED.content}を編集` }).click();
  getByRole("button", { name: `${ACHIEVED.content}を削除` }).click();
  expect(onEditGoal).toHaveBeenCalledWith(ACHIEVED);
  expect(onRemoveGoal).toHaveBeenCalledWith(ACHIEVED._id);
});
