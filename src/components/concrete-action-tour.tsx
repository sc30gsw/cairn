import { OnboardingTour, type OnboardingTourStep } from "@gfazioli/mantine-onboarding-tour";
import { useState, type ReactNode } from "react";

type TourScreen = "goals" | "presets" | "today";

const STORAGE_PREFIX = "cairn:concrete-action-tour:v1";

const TOUR_STEPS = {
  goals: [
    {
      content:
        "障害が起きたとき、最初に取る行動を書きます。「金フレだけ」ではなく、何をどうするかを8文字以上で。",
      id: "svo-obstacle-then",
      title: "具体的手順（なら）",
    },
  ],
  presets: [
    {
      content:
        "プリセットの各行も、実行できる一歩を書きます。項目名ではなく、今日の最初の動作を書いてください。",
      id: "svo-preset-content",
      title: "具体的手順",
    },
  ],
  today: [
    {
      content:
        "「〜を勉強する」ではなく、今日の最初の一歩を書きます。8文字以上で、声に出して実行できる粒度に。",
      id: "svo-row-content",
      title: "具体的手順",
    },
  ],
} as const satisfies Record<TourScreen, OnboardingTourStep[]>;

function tourStorageKey(screen: TourScreen) {
  return `${STORAGE_PREFIX}:${screen}`;
}

function hasSeenTour(screen: TourScreen) {
  try {
    return localStorage.getItem(tourStorageKey(screen)) === "1";
  } catch {
    return true;
  }
}

function markTourSeen(screen: TourScreen) {
  try {
    localStorage.setItem(tourStorageKey(screen), "1");
  } catch {
    // localStorage unavailable
  }
}

type ConcreteActionTourProps = {
  children: ReactNode;
  screen: TourScreen;
};

export function ConcreteActionTour({ children, screen }: ConcreteActionTourProps) {
  const [started, setStarted] = useState(() => !hasSeenTour(screen));

  return (
    <OnboardingTour
      onOnboardingTourEnd={() => {
        markTourSeen(screen);
        setStarted(false);
      }}
      started={started}
      tour={[...TOUR_STEPS[screen]]}
    >
      {children}
    </OnboardingTour>
  );
}
