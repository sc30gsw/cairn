import { Tooltip, type TooltipProps } from "@mantine/core";
import { useMergedRef } from "@mantine/hooks";
import { useRef, type ReactElement, type Ref } from "react";

import { useIsTextTruncated } from "~/hooks/use-is-text-truncated";

const EVENTS = { focus: true, hover: true, touch: false } satisfies TooltipProps["events"];

type OverflowTooltipProps<T extends HTMLElement> = {
  children: (ref: Ref<T>, truncated: boolean) => ReactElement;
  content: string;
  label?: string;
  targetRef?: Ref<T>;
};

export function OverflowTooltip<T extends HTMLElement>({
  children,
  content,
  label = content,
  targetRef,
}: OverflowTooltipProps<T>) {
  const elementRef = useRef<T | null>(null);
  const mergedRef = useMergedRef(elementRef, targetRef);
  const truncated = useIsTextTruncated(elementRef, content);

  return (
    <Tooltip disabled={!truncated} events={EVENTS} label={label} maw={320} multiline withArrow>
      {children(mergedRef, truncated)}
    </Tooltip>
  );
}
