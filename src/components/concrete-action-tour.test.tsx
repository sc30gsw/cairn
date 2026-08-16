import { expect, test, vi } from "vite-plus/test";

import { ConcreteActionTour } from "~/components/concrete-action-tour";
import { renderWithMantine } from "~/test-utils/render";

test("初回訪問でツアーを開始し、終了後は localStorage に記録する", () => {
  const storage = new Map<string, string>();
  vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => storage.get(key) ?? null);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
    storage.set(key, value);
  });

  const { getByText, rerender } = renderWithMantine(
    <ConcreteActionTour screen="today">
      <div data-onboarding-tour-id="svo-row-content">記録</div>
    </ConcreteActionTour>,
  );

  expect(storage.has("cairn:concrete-action-tour:v1:today")).toBe(false);

  rerender(
    <ConcreteActionTour screen="today">
      <div data-onboarding-tour-id="svo-row-content">記録</div>
    </ConcreteActionTour>,
  );

  expect(getByText("記録")).toBeDefined();
});

test("localStorage に記録済みならツアーを開始しない", () => {
  const storage = new Map<string, string>([["cairn:concrete-action-tour:v1:presets", "1"]]);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => storage.get(key) ?? null);

  const { getByText } = renderWithMantine(
    <ConcreteActionTour screen="presets">
      <div>プリセット</div>
    </ConcreteActionTour>,
  );

  expect(getByText("プリセット")).toBeDefined();
});
