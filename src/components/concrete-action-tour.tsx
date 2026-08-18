import { OnboardingTour, type OnboardingTourStep } from "@gfazioli/mantine-onboarding-tour";
import { ActionIcon, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHelpCircle } from "@tabler/icons-react";
import { createContext, use, type ReactNode } from "react";

import { CONCRETE_ACTION_TOUR_TARGETS } from "~/components/concrete-action-tour-targets";

type TourScreen = "obstacles" | "presets" | "today";

const TOUR_STEPS = {
  obstacles: [
    {
      content:
        "障害が起きたとき、最初に取る行動を書きます。「金フレだけ」ではなく、何をどうするかを具体的に。",
      id: CONCRETE_ACTION_TOUR_TARGETS.obstacles,
      title: "具体的手順（なら）",
    },
  ],
  presets: [
    {
      content:
        "項目名だけで足りるなら空でかまいません。点数や単元名など、書く価値があるときだけ埋めてください。",
      id: CONCRETE_ACTION_TOUR_TARGETS.presets,
      title: "ひとこと",
    },
  ],
  today: [
    {
      content:
        "項目名だけで足りるなら空でかまいません。点数や単元名など、書く価値があるときだけ埋めてください。",
      id: CONCRETE_ACTION_TOUR_TARGETS.today,
      title: "ひとこと",
    },
  ],
} as const satisfies Record<TourScreen, OnboardingTourStep[]>;

const ConcreteActionTourContext = createContext<(() => void) | null>(null);

export function ConcreteActionTourTrigger() {
  const startTour = use(ConcreteActionTourContext);
  if (startTour === null) {
    return null;
  }

  return (
    <Tooltip label="この画面の書き方ガイド">
      <ActionIcon
        aria-label="この画面の書き方ガイドを表示"
        onClick={startTour}
        size="sm"
        variant="subtle"
      >
        <IconHelpCircle aria-hidden size={18} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
}

type ConcreteActionTourProps = {
  children: ReactNode;
  screen: TourScreen;
};

export function ConcreteActionTour({ children, screen }: ConcreteActionTourProps) {
  const [started, { close, open }] = useDisclosure(false);

  return (
    <ConcreteActionTourContext value={open}>
      <OnboardingTour
        focusRevealProps={{ popoverProps: { position: "bottom" } }}
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
