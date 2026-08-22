import type { FunctionReturnType } from "convex/server";
import { expect, test } from "vite-plus/test";

import { api } from "~/../convex/_generated/api";
import { setupStatusValidator } from "~/../convex/lib/setupStatus";
import type { SetupStatus } from "~/features/onboarding/types/setup-status";

type ValidatorSetupStatus = (typeof setupStatusValidator)["type"];

test("SetupStatus は api.queries.setup.status.status の戻り値型と一致する", () => {
  const _queryReturn: FunctionReturnType<typeof api.queries.setup.status.status> = {
    examGoalCount: 0,
    hasExamGoal: false,
    hasItems: false,
    hasPresets: false,
    hasWeeklyTargets: false,
    isComplete: false,
    itemCount: 0,
    presetCount: 0,
    targetCount: 0,
  } satisfies SetupStatus;

  const _frontendStatus: SetupStatus = _queryReturn;
  const _validatorShape: ValidatorSetupStatus = _frontendStatus;

  expect(_frontendStatus.isComplete).toBe(false);
  expect(_validatorShape.hasItems).toBe(false);
});
