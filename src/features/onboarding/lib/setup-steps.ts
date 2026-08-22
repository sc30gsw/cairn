import type { SetupStatus } from "~/features/onboarding/types/setup-status";

export const SETUP_STEP_IDS = ["items", "presets", "examGoal", "weeklyTargets"] as const;

export type SetupStepId = (typeof SETUP_STEP_IDS)[number];

export type SetupStep = {
  description: string;
  href: "/goals" | "/items" | "/presets";
  id: SetupStepId;
  label: string;
  sampleHint: string;
  tooltip: string;
};

export const SETUP_STEPS = [
  {
    description: "今日の行に並べる学習項目を登録します。",
    href: "/items",
    id: "items",
    label: "項目を登録する",
    sampleHint: "例: 問題集、過去問、暗記カード",
    tooltip:
      "項目は今日の行の種類です。カテゴリー付きで登録すると、週間ターゲットともつながります。",
  },
  {
    description: "曜日ごとの並び順を決めます。",
    href: "/presets",
    id: "presets",
    label: "プリセットを登録する",
    sampleHint: "例: 月曜は多聴→英会話→…",
    tooltip: "プリセットは曜日テンプレートです。日を開くと、この並びが今日の行になります。",
  },
  {
    description: "本番日と目標スコアを置きます。",
    href: "/goals",
    id: "examGoal",
    label: "本番目標を設定する",
    sampleHint: "例: 2026-10-01 資格試験 800点",
    tooltip: "本番目標はカウントダウンの起点です。週間ターゲットとセットで使います。",
  },
  {
    description: "カテゴリーごとの今週のノルマを決めます。",
    href: "/goals",
    id: "weeklyTargets",
    label: "週間ターゲットを設定する",
    sampleHint: "例: 多聴 180分 / 週",
    tooltip: "週間ターゲットは日々の行動量の物差しです。確定記録から自動集計されます。",
  },
] as const satisfies readonly SetupStep[];

const STEP_COMPLETE: Record<SetupStepId, (status: SetupStatus) => boolean> = {
  examGoal: (status) => status.hasExamGoal,
  items: (status) => status.hasItems,
  presets: (status) => status.hasPresets,
  weeklyTargets: (status) => status.hasWeeklyTargets,
};

export function isSetupStepComplete(status: SetupStatus, stepId: SetupStepId): boolean {
  return STEP_COMPLETE[stepId](status);
}

export function firstIncompleteSetupStep(
  status: SetupStatus,
  dismissed: ReadonlySet<SetupStepId>,
): SetupStep | null {
  for (const step of SETUP_STEPS) {
    if (dismissed.has(step.id)) {
      continue;
    }
    if (!isSetupStepComplete(status, step.id)) {
      return step;
    }
  }
  return null;
}

/** Falls back to the first incomplete step when every step was dismissed. */
export function visibleSetupStep(
  status: SetupStatus,
  dismissed: ReadonlySet<SetupStepId>,
): SetupStep | null {
  const next = firstIncompleteSetupStep(status, dismissed);
  if (next !== null) {
    return next;
  }
  if (status.isComplete) {
    return null;
  }
  return incompleteSetupSteps(status)[0] ?? null;
}

export function incompleteSetupSteps(status: SetupStatus): SetupStep[] {
  return SETUP_STEPS.filter((step) => !isSetupStepComplete(status, step.id));
}

export function shouldShowHomeSetupStepper(
  status: SetupStatus,
  dismissed: ReadonlySet<SetupStepId>,
): boolean {
  return visibleSetupStep(status, dismissed) !== null;
}
