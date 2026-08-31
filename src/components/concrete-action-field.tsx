import {
  Autocomplete,
  type AutocompleteProps,
  TextInput,
  type TextInputProps,
} from "@mantine/core";
import type { ReactNode } from "react";
import {
  concreteActionPlaceholder,
  DEFAULT_CONCRETE_ACTION_PLACEHOLDER,
} from "~domain/concreteActionCore";

import { ConcreteActionLabel } from "~/components/concrete-action-label";

export type ConcreteActionFieldProps = Omit<TextInputProps, "description" | "label"> & {
  itemName?: string;
  label?: ReactNode;
  onValueChange?: (value: string) => void;
  suggestions?: string[];
  tooltipExample?: string;
  wrapLabel?: boolean;
};

export function ConcreteActionField({
  classNames,
  defaultValue,
  itemName,
  label,
  onChange,
  onValueChange,
  placeholder,
  styles,
  suggestions,
  tooltipExample,
  value,
  vars,
  wrapLabel = true,
  ...props
}: ConcreteActionFieldProps) {
  const resolvedPlaceholder =
    placeholder ??
    (itemName === undefined
      ? DEFAULT_CONCRETE_ACTION_PLACEHOLDER
      : concreteActionPlaceholder(itemName));
  const resolvedLabel = wrapLabel ? (
    <ConcreteActionLabel label={label} tooltipExample={tooltipExample} />
  ) : (
    label
  );

  if (suggestions !== undefined) {
    return (
      <Autocomplete
        {...props}
        classNames={classNames as AutocompleteProps["classNames"]}
        data={suggestions}
        label={resolvedLabel}
        onChange={onValueChange}
        placeholder={resolvedPlaceholder}
        styles={styles as AutocompleteProps["styles"]}
        value={typeof value === "string" ? value : undefined}
        vars={vars as AutocompleteProps["vars"]}
      />
    );
  }

  return (
    <TextInput
      {...props}
      classNames={classNames}
      defaultValue={defaultValue}
      label={resolvedLabel}
      onChange={(event) => {
        onChange?.(event);
        onValueChange?.(event.currentTarget.value);
      }}
      placeholder={resolvedPlaceholder}
      styles={styles}
      value={value}
      vars={vars}
    />
  );
}
