import { TextInput, type TextInputProps } from "@mantine/core";
import type { ReactNode } from "react";
import {
  CONCRETE_ACTION_VALIDATION_MESSAGE,
  concreteActionPlaceholder,
  DEFAULT_CONCRETE_ACTION_PLACEHOLDER,
} from "~domain/concreteActionCore";

import { ConcreteActionLabel } from "~/components/concrete-action-label";

type ConcreteActionFieldProps = Omit<TextInputProps, "description" | "label"> & {
  itemName?: string;
  label?: ReactNode;
  showLabel?: boolean;
  tourId?: string;
  tooltipExample?: string;
};

export function ConcreteActionField({
  itemName,
  label,
  placeholder,
  showLabel = true,
  tourId,
  tooltipExample,
  ...props
}: ConcreteActionFieldProps) {
  const resolvedPlaceholder =
    placeholder ??
    (itemName === undefined
      ? DEFAULT_CONCRETE_ACTION_PLACEHOLDER
      : concreteActionPlaceholder(itemName));

  return (
    <TextInput
      {...props}
      data-onboarding-tour-id={tourId}
      description={CONCRETE_ACTION_VALIDATION_MESSAGE}
      label={
        showLabel ? <ConcreteActionLabel label={label} tooltipExample={tooltipExample} /> : label
      }
      placeholder={resolvedPlaceholder}
    />
  );
}
