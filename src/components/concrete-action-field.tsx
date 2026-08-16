import {
  Autocomplete,
  type AutocompleteProps,
  TextInput,
  type TextInputProps,
} from "@mantine/core";
import type { ChangeEvent, ReactNode } from "react";
import {
  concreteActionPlaceholder,
  DEFAULT_CONCRETE_ACTION_PLACEHOLDER,
} from "~domain/concreteActionCore";

import { ConcreteActionLabel } from "~/components/concrete-action-label";

export type ConcreteActionFieldProps = Omit<TextInputProps, "description" | "label"> & {
  itemName?: string;
  label?: ReactNode;
  showLabel?: boolean;
  suggestions?: string[];
  tooltipExample?: string;
};

export function ConcreteActionField({
  classNames,
  defaultValue,
  itemName,
  label,
  onChange,
  placeholder,
  showLabel = true,
  styles,
  suggestions,
  tooltipExample,
  value,
  vars,
  ...props
}: ConcreteActionFieldProps) {
  const resolvedPlaceholder =
    placeholder ??
    (itemName === undefined
      ? DEFAULT_CONCRETE_ACTION_PLACEHOLDER
      : concreteActionPlaceholder(itemName));
  const resolvedLabel = showLabel ? (
    <ConcreteActionLabel label={label} tooltipExample={tooltipExample} />
  ) : (
    label
  );

  if (suggestions !== undefined) {
    return (
      <Autocomplete
        {...props}
        //? StylesApi の型は TextInput/Autocomplete それぞれの factory に紐づくが、実体は同じ Input.Wrapper のスタイル名を含む
        classNames={classNames as AutocompleteProps["classNames"]}
        data={suggestions}
        label={resolvedLabel}
        //? Autocomplete の onChange は値ベース。このコンポーネントの公開 API(ChangeEvent ベース)を保つため変換する
        onChange={(nextValue) => {
          onChange?.({
            currentTarget: { value: nextValue },
            target: { value: nextValue },
          } as ChangeEvent<HTMLInputElement>);
        }}
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
      onChange={onChange}
      placeholder={resolvedPlaceholder}
      styles={styles}
      value={value}
      vars={vars}
    />
  );
}
