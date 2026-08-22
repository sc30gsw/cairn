import { screen } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import { MyPageOnboardingExtras } from "~/features/onboarding/components/my-page-onboarding-extras";
import type { SetupStatus } from "~/features/onboarding/types/setup-status";
import { renderWithMantine } from "~/test-utils/render";

const { useSetupStatus } = vi.hoisted(() => ({
  useSetupStatus: vi.fn(),
}));

vi.mock("~/features/onboarding/hooks/use-setup-status", () => ({
  useSetupStatus,
}));

function mockStatus(overrides: Partial<SetupStatus>): SetupStatus {
  return {
    hasExamGoal: false,
    hasItems: false,
    hasPresets: false,
    hasWeeklyTargets: false,
    isComplete: false,
    ...overrides,
  };
}

test("MyPageOnboardingExtras はプリセット未登録のときカタログ例を表示する", () => {
  useSetupStatus.mockReturnValue({
    dismissStep: vi.fn(),
    dismissed: new Set(),
    firstStep: null,
    showHomeStepper: false,
    status: mockStatus({ hasPresets: false, isComplete: true }),
  });

  renderWithMantine(<MyPageOnboardingExtras />);

  expect(screen.getByText("カタログ例")).toBeDefined();
});

test("MyPageOnboardingExtras はプリセット登録済みならカタログ例を表示しない", () => {
  useSetupStatus.mockReturnValue({
    dismissStep: vi.fn(),
    dismissed: new Set(),
    firstStep: null,
    showHomeStepper: false,
    status: mockStatus({ hasPresets: true, isComplete: true }),
  });

  renderWithMantine(<MyPageOnboardingExtras />);

  expect(screen.queryByText("カタログ例")).toBeNull();
});
