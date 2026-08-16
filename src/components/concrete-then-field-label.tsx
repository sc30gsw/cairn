import type { ReactNode } from "react";
import { OBSTACLE_THEN_PLACEHOLDER } from "~domain/concreteActionCore";

import { ConcreteActionLabel } from "~/components/concrete-action-label";

type ConcreteThenFieldLabelProps = {
  label?: ReactNode;
  tooltipExample?: string;
};

export function ConcreteThenFieldLabel({
  label = "なら",
  tooltipExample = OBSTACLE_THEN_PLACEHOLDER,
}: ConcreteThenFieldLabelProps) {
  return <ConcreteActionLabel label={label} tooltipExample={tooltipExample} />;
}
