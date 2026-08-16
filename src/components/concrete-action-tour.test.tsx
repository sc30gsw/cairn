import { fireEvent } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import { ConcreteActionField } from "~/components/concrete-action-field";
import { ConcreteActionTour } from "~/components/concrete-action-tour";
import { renderWithMantine } from "~/test-utils/render";

test("初回表示ではツアーを自動開始しない", () => {
  const { queryByText } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <div data-onboarding-tour-id="svo-row-content">記録</div>
    </ConcreteActionTour>,
  );

  expect(queryByText("具体的手順")).toBeNull();
});

test("ヘルプアイコンをクリックするとツアーを開始する", () => {
  const { getByLabelText, getByText } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <ConcreteActionField label="記録" name="content" tourId="svo-row-content" />
    </ConcreteActionTour>,
  );

  fireEvent.click(getByLabelText("具体的手順のガイドを表示"));

  expect(getByText("具体的手順")).toBeDefined();
  expect(
    getByText("「〜を勉強する」ではなく、今日の最初の一歩を書きます。8文字以上で、声に出して実行できる粒度に。"),
  ).toBeDefined();
});

test("ツアー外ではヘルプアイコンを押してもクラッシュしない", () => {
  const { getByLabelText } = renderWithMantine(
    <ConcreteActionField label="記録" name="content" tourId="svo-row-content" />,
  );

  fireEvent.click(getByLabelText("具体的手順のガイドを表示"));
});
