import { Text, Tooltip, type TextProps } from "@mantine/core";
import { useRef } from "react";

import { useIsTextTruncated } from "~/hooks/use-is-text-truncated";

type TruncatedTextProps = TextProps & {
  children: string;
  tooltipLabel?: string;
};

export function TruncatedText({ children, tooltipLabel, ...textProps }: TruncatedTextProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const truncated = useIsTextTruncated(elementRef, children);
  const label = tooltipLabel ?? children;

  function setElementRef(node: HTMLDivElement | HTMLParagraphElement | null) {
    elementRef.current = node;
  }

  return (
    <Tooltip disabled={!truncated} label={label} withArrow>
      <Text ref={setElementRef} {...textProps}>
        {children}
      </Text>
    </Tooltip>
  );
}
