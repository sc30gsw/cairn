export const CONCRETE_ACTION_TOUR_TARGETS = {
  obstacles: "svo-obstacle-then",
  presets: "svo-preset-content",
  today: "svo-row-content",
} as const;

export type ConcreteActionTourTarget =
  (typeof CONCRETE_ACTION_TOUR_TARGETS)[keyof typeof CONCRETE_ACTION_TOUR_TARGETS];
