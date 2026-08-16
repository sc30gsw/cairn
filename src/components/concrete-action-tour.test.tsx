import { Box } from "@mantine/core";
import { fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test } from "vite-plus/test";

import { ConcreteActionField } from "~/components/concrete-action-field";
import { ConcreteActionTour, ConcreteActionTourTrigger } from "~/components/concrete-action-tour";
import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";
import { renderWithMantine } from "~/test-utils/render";

test("初回表示ではツアーを自動開始しない", () => {
  const { container, queryByLabelText } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <ConcreteActionTourTrigger />
      <Box data-onboarding-tour-id={CONCRETE_ACTION_TOUR_TARGETS.today}>記録</Box>
    </ConcreteActionTour>,
  );

  expect(container.querySelector("[data-onboarding-tour-overlay]")).toBeNull();
  expect(queryByLabelText("この画面の書き方ガイドを表示")).toBeDefined();
});

test("ページのヘルプアイコンをクリックするとツアーを開始する", async () => {
  const { container, getByLabelText } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <ConcreteActionTourTrigger />
      <Box data-onboarding-tour-id={CONCRETE_ACTION_TOUR_TARGETS.today}>
        <ConcreteActionField label="記録" name="content" />
      </Box>
    </ConcreteActionTour>,
  );

  fireEvent.click(getByLabelText("この画面の書き方ガイドを表示"));

  await waitFor(() => {
    expect(container.querySelector("[data-onboarding-tour-overlay]")).not.toBeNull();
  });
  expect(container.querySelector("[data-onboarding-tour-focus-reveal-mode]")).not.toBeNull();
});

test("フィールドのアイコンはクリックしてもツアーを開始しない", () => {
  const { container, getByLabelText } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <ConcreteActionTourTrigger />
      <Box data-onboarding-tour-id={CONCRETE_ACTION_TOUR_TARGETS.today}>
        <ConcreteActionField label="記録" name="content" />
      </Box>
    </ConcreteActionTour>,
  );

  fireEvent.click(getByLabelText("具体的手順の書き方"));

  expect(container.querySelector("[data-onboarding-tour-overlay]")).toBeNull();
});

test("ツアー外ではページトリガーを描画しない", () => {
  const { queryByLabelText } = renderWithMantine(<ConcreteActionTourTrigger />);

  expect(queryByLabelText("この画面の書き方ガイドを表示")).toBeNull();
});

test("コンポーネント内部に付けた data 属性は FocusReveal されない", async () => {
  function InternalTourTarget() {
    return <Box data-onboarding-tour-id={CONCRETE_ACTION_TOUR_TARGETS.today}>記録</Box>;
  }

  const { container, getByLabelText } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <ConcreteActionTourTrigger />
      <InternalTourTarget />
    </ConcreteActionTour>,
  );

  fireEvent.click(getByLabelText("この画面の書き方ガイドを表示"));

  await waitFor(() => {
    expect(container.querySelector("[data-onboarding-tour-overlay]")).not.toBeNull();
  });
  expect(container.querySelector("[data-onboarding-tour-focus-reveal-mode]")).toBeNull();
});

test("render-prop（Formisch Field 相当）はコンポーネント境界の内側に置けば安全", async () => {
  // ライブラリの wrapChildren は data-onboarding-tour-id を持たない要素を
  // React.Children.map で再帰的に書き換えるため、function-as-children (Field 相当) が
  // コンポーネント境界の外(直接 JSX に書かれた状態)にあると "children is not a function" で
  // クラッシュする。境界の内側(自身の props.children を持たないコンポーネント)に
  // 隠せば再帰が及ばず安全になる — goals-board.tsx の ExamGoalForm 等と同じパターン。
  function InnerFieldLike({ children }: { children: (value: string) => ReactNode }) {
    return <>{children("値")}</>;
  }

  function ProtectedField() {
    return <InnerFieldLike>{(value) => <div>{value}</div>}</InnerFieldLike>;
  }

  const { container, getByLabelText } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <ConcreteActionTourTrigger />
      <ProtectedField />
      <Box data-onboarding-tour-id={CONCRETE_ACTION_TOUR_TARGETS.today}>記録</Box>
    </ConcreteActionTour>,
  );

  expect(() => {
    fireEvent.click(getByLabelText("この画面の書き方ガイドを表示"));
  }).not.toThrow();

  await waitFor(() => {
    expect(container.querySelector("[data-onboarding-tour-overlay]")).not.toBeNull();
  });
});
