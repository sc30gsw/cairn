import { waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { ConcreteActionTour } from "~/components/concrete-action-tour";
import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";
import { renderWithMantine } from "~/test-utils/render";

test("初回訪問はマウント後にツアーオーバーレイを出す", async () => {
  const storage = new Map<string, string>();
  vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => storage.get(key) ?? null);

  renderWithMantine(
    <ConcreteActionTour screen="today">
      <div data-onboarding-tour-id={CONCRETE_ACTION_TOUR_TARGETS.today}>記録</div>
    </ConcreteActionTour>,
  );

  expect(storage.has("cairn:concrete-action-tour:v1:today")).toBe(false);
  await waitFor(() => {
    expect(document.querySelector('[data-onboarding-tour-overlay="true"]')).not.toBeNull();
  });
});

test("localStorage に記録済みならツアーオーバーレイを出さない", async () => {
  const storage = new Map<string, string>([["cairn:concrete-action-tour:v1:presets", "1"]]);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) => storage.get(key) ?? null);

  renderWithMantine(
    <ConcreteActionTour screen="presets">
      <div>プリセット</div>
    </ConcreteActionTour>,
  );

  await waitFor(() => {
    expect(document.querySelector('[data-onboarding-tour-overlay="true"]')).toBeNull();
  });
});
