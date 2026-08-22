import { Text, Tooltip, type TextProps } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";

import { useIsTextTruncated } from "~/hooks/use-is-text-truncated";

type TruncatedTextProps = TextProps & {
  children: string;
  to?: string;
  tooltipLabel?: string;
};

export function TruncatedText({ children, to, tooltipLabel, ...textProps }: TruncatedTextProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const truncated = useIsTextTruncated(elementRef, children);
  const label = tooltipLabel ?? children;
  const linkProps = to === undefined ? {} : { component: Link, to };

  function setElementRef(node: HTMLAnchorElement | HTMLDivElement | HTMLParagraphElement | null) {
    elementRef.current = node;
  }

  return (
    <Tooltip disabled={!truncated} label={label} withArrow>
      <Text ref={setElementRef} {...linkProps} {...textProps}>
        {children}
      </Text>
    </Tooltip>
  );
}
