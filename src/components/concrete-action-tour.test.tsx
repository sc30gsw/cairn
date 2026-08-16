import { Box } from "@mantine/core";
import { fireEvent, waitFor } from "@testing-library/react";
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
