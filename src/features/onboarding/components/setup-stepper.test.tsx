import { fireEvent, screen } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { SetupStepper } from "~/features/onboarding/components/setup-stepper";
import { SETUP_STEPS } from "~/features/onboarding/lib/setup-steps";
import type { SetupStatus } from "~/features/onboarding/types/setup-status";
import { renderWithMemoryRouter } from "~/test-utils/render";

const emptyStatus = {
  hasExamGoal: false,
  hasItems: false,
  hasPresets: false,
  hasWeeklyTargets: false,
  isComplete: false,
} satisfies SetupStatus;

test("あとで設定にした項目は、次の案内に進んでも完了にならない", async () => {
  const onDismiss = vi.fn();
  await renderWithMemoryRouter(
    <SetupStepper
      activeStep={SETUP_STEPS[1]}
      dismissed={new Set(["items"])}
      onDismiss={onDismiss}
      status={emptyStatus}
    />,
  );

  const deferred = screen.getByRole("button", { name: "項目を登録する: あとで設定" });
  const current = screen.getByRole("button", { name: "プリセットを登録する: 次の設定" });
  expect(deferred.hasAttribute("data-completed")).toBe(false);
  expect(deferred.hasAttribute("data-progress")).toBe(false);
  expect(current.getAttribute("aria-current")).toBe("step");
  expect(current.hasAttribute("data-progress")).toBe(true);
  expect(screen.getByRole("link", { name: "プリセットを登録する" }).getAttribute("href")).toBe(
    "/presets",
  );

  fireEvent.click(screen.getByRole("button", { name: "あとで設定" }));
  expect(onDismiss).toHaveBeenCalledOnce();
});

test("順番より先に設定した本番目標も実際の完了状態で表示する", async () => {
  await renderWithMemoryRouter(
    <SetupStepper
      activeStep={SETUP_STEPS[0]}
      dismissed={new Set()}
      onDismiss={vi.fn()}
      status={{ ...emptyStatus, hasExamGoal: true }}
    />,
  );

  expect(
    screen.getByRole("button", { name: "本番目標を設定する: 完了" }).hasAttribute("data-completed"),
  ).toBe(true);
  expect(
    screen
      .getByRole("button", { name: "プリセットを登録する: 未設定" })
      .hasAttribute("data-completed"),
  ).toBe(false);
  expect(
    screen.getByRole("button", { name: "項目を登録する: 次の設定" }).getAttribute("aria-current"),
  ).toBe("step");
});
