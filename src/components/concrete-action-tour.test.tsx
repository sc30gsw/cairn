import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import { ConcreteActionField } from "~/components/concrete-action-field";
import { ConcreteActionTour, ConcreteActionTourTrigger } from "~/components/concrete-action-tour";
import { renderWithMantine } from "~/test-utils/render";

test("初回表示ではツアーを自動開始しない", () => {
  const { container, queryByLabelText } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <ConcreteActionTourTrigger />
      <div data-onboarding-tour-id="svo-row-content">記録</div>
    </ConcreteActionTour>,
  );

  expect(container.querySelector("[data-onboarding-tour-overlay]")).toBeNull();
  expect(queryByLabelText("この画面の書き方ガイドを表示")).toBeDefined();
});

test("ページのヘルプアイコンをクリックするとツアーを開始する", async () => {
  const { container, getByLabelText } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <ConcreteActionTourTrigger />
      <ConcreteActionField label="記録" name="content" tourId="svo-row-content" />
    </ConcreteActionTour>,
  );

  fireEvent.click(getByLabelText("この画面の書き方ガイドを表示"));

  await waitFor(() => {
    expect(container.querySelector("[data-onboarding-tour-overlay]")).not.toBeNull();
  });
});

test("フィールドのアイコンはクリックしてもツアーを開始しない", () => {
  const { container, getByLabelText } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <ConcreteActionTourTrigger />
      <ConcreteActionField label="記録" name="content" tourId="svo-row-content" />
    </ConcreteActionTour>,
  );

  fireEvent.click(getByLabelText("具体的手順の書き方"));

  expect(container.querySelector("[data-onboarding-tour-overlay]")).toBeNull();
});

test("ツアー外ではページトリガーを描画しない", () => {
  const { queryByLabelText } = renderWithMantine(<ConcreteActionTourTrigger />);

  expect(queryByLabelText("この画面の書き方ガイドを表示")).toBeNull();
});
