import { Text, type TextProps } from "@mantine/core";
import type { ComponentPropsWithoutRef } from "react";

import { OverflowTooltip } from "~/components/overflow-tooltip";

type TruncatedTextProps = TextProps & {
  children: string;
  tabIndex?: ComponentPropsWithoutRef<"p">["tabIndex"];
  tooltipLabel?: string;
};

export function TruncatedText({
  children,
  tabIndex,
  tooltipLabel,
  ...textProps
}: TruncatedTextProps) {
  return (
    <OverflowTooltip<HTMLParagraphElement> content={children} label={tooltipLabel}>
      {(ref, truncated) => (
        <Text ref={ref} tabIndex={truncated ? (tabIndex ?? 0) : tabIndex} {...textProps}>
          {children}
        </Text>
      )}
    </OverflowTooltip>
  );
}
