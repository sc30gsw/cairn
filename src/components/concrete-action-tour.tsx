import { OnboardingTour, type OnboardingTourStep } from "@gfazioli/mantine-onboarding-tour";
import { useDisclosure } from "@mantine/hooks";
import { createContext, use, type ReactNode } from "react";

type TourScreen = "goals" | "presets" | "today";

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

type ConcreteActionTourContextValue = {
  startTour: () => void;
};

const ConcreteActionTourContext = createContext<ConcreteActionTourContextValue | null>(null);

export function useConcreteActionTour() {
  return use(ConcreteActionTourContext);
}

type ConcreteActionTourProps = {
  children: ReactNode;
  screen: TourScreen;
};

export function ConcreteActionTour({ children, screen }: ConcreteActionTourProps) {
  const [started, { close, open }] = useDisclosure(false);

  return (
    <ConcreteActionTourContext value={{ startTour: open }}>
      <OnboardingTour
        onOnboardingTourEnd={close}
        onOnboardingTourSkip={close}
        started={started}
        tour={[...TOUR_STEPS[screen]]}
      >
        {children}
      </OnboardingTour>
    </ConcreteActionTourContext>
  );
}
