import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { ObstacleSection } from "~/features/goals/components/obstacle-section";
import type { Obstacle } from "~/features/goals/types/goal";
import { renderWithMantine } from "~/test-utils/render";

const THEN_ACTION = "Unit 3 の例文を声に出して5文読む";

function sectionProps(overrides: Partial<Parameters<typeof ObstacleSection>[0]> = {}) {
  return {
    obstacles: [],
    onCreateObstacle: vi.fn(),
    onRemoveObstacle: vi.fn(),
    onUpdateObstacle: vi.fn(),
    ...overrides,
  };
}

test("ならが空なら障害プランは追加できない", async () => {
  const onCreateObstacle = vi.fn();
  const { getByRole } = renderWithMantine(
    <ObstacleSection {...sectionProps({ onCreateObstacle })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "もし" }), { target: { value: "眠い" } });
  getByRole("button", { name: "障害プランを追加" }).click();
  await waitFor(() => {
    expect(onCreateObstacle).not.toHaveBeenCalled();
  });
});

test("空の障害プランは追加できない", async () => {
  const onCreateObstacle = vi.fn();
  const { getByRole } = renderWithMantine(
    <ObstacleSection {...sectionProps({ onCreateObstacle })} />,
  );
  getByRole("button", { name: "障害プランを追加" }).click();
  await waitFor(() => {
    expect(onCreateObstacle).not.toHaveBeenCalled();
  });
});

test("入力した障害プランを追加するとフォームがリセットされる", async () => {
  const onCreateObstacle = vi.fn();
  const { getByRole } = renderWithMantine(
    <ObstacleSection {...sectionProps({ onCreateObstacle })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "もし" }), { target: { value: "眠い" } });
  fireEvent.change(getByRole("textbox", { name: "なら" }), { target: { value: THEN_ACTION } });
  getByRole("button", { name: "障害プランを追加" }).click();

  await waitFor(() => {
    expect(onCreateObstacle).toHaveBeenCalledWith({
      ifText: "眠い",
      thenText: THEN_ACTION,
    });
  });
  expect((getByRole("textbox", { name: "もし" }) as HTMLInputElement).value).toBe("");
});

test("既存プランは保存と削除ができる", async () => {
  const onUpdateObstacle = vi.fn();
  const onRemoveObstacle = vi.fn();
  const plan = { _id: "o1" as Obstacle["_id"], ifText: "眠い", thenText: THEN_ACTION };
  const { getByRole } = renderWithMantine(
    <ObstacleSection
      {...sectionProps({ obstacles: [plan], onRemoveObstacle, onUpdateObstacle })}
    />,
  );
  getByRole("button", { name: "眠いを保存" }).click();
  await waitFor(() => {
    expect(onUpdateObstacle).toHaveBeenCalledWith({
      ifText: "眠い",
      planId: "o1",
      thenText: THEN_ACTION,
    });
  });

  getByRole("button", { name: "削除" }).click();
  expect(onRemoveObstacle).toHaveBeenCalledWith("o1");
});

test("既存プランのもしが空なら保存できない", async () => {
  const onUpdateObstacle = vi.fn();
  const plan = { _id: "o1" as Obstacle["_id"], ifText: "眠い", thenText: THEN_ACTION };
  const { getByRole } = renderWithMantine(
    <ObstacleSection {...sectionProps({ obstacles: [plan], onUpdateObstacle })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "眠いのもし" }), { target: { value: "  " } });
  getByRole("button", { name: "眠いを保存" }).click();
  await waitFor(() => {
    expect(onUpdateObstacle).not.toHaveBeenCalled();
  });
});

test("既存プランのならが空なら保存できない", async () => {
  const onUpdateObstacle = vi.fn();
  const plan = { _id: "o1" as Obstacle["_id"], ifText: "眠い", thenText: THEN_ACTION };
  const { getByRole } = renderWithMantine(
    <ObstacleSection {...sectionProps({ obstacles: [plan], onUpdateObstacle })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "眠いのなら" }), { target: { value: "  " } });
  getByRole("button", { name: "眠いを保存" }).click();
  await waitFor(() => {
    expect(onUpdateObstacle).not.toHaveBeenCalled();
  });
});

test("もしが空なら新規追加できない", async () => {
  const onCreateObstacle = vi.fn();
  const { getByRole } = renderWithMantine(
    <ObstacleSection {...sectionProps({ onCreateObstacle })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "なら" }), { target: { value: THEN_ACTION } });
  getByRole("button", { name: "障害プランを追加" }).click();
  await waitFor(() => {
    expect(onCreateObstacle).not.toHaveBeenCalled();
  });
});

test("既存プランの内容を更新できる", async () => {
  const onUpdateObstacle = vi.fn();
  const plan = { _id: "o1" as Obstacle["_id"], ifText: "眠い", thenText: THEN_ACTION };
  const { getByRole } = renderWithMantine(
    <ObstacleSection {...sectionProps({ obstacles: [plan], onUpdateObstacle })} />,
  );
  fireEvent.change(getByRole("textbox", { name: "眠いのもし" }), {
    target: { value: "集中が切れた" },
  });
  fireEvent.change(getByRole("textbox", { name: "眠いのなら" }), {
    target: { value: "5分だけ休憩して戻る" },
  });
  getByRole("button", { name: "眠いを保存" }).click();
  await waitFor(() => {
    expect(onUpdateObstacle).toHaveBeenCalledWith({
      ifText: "集中が切れた",
      planId: "o1",
      thenText: "5分だけ休憩して戻る",
    });
  });
});
