import { ActionIcon, Group, Text, TextInput, Tooltip, type TextInputProps } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { CONCRETE_ACTION_VALIDATION_MESSAGE } from "~domain/concreteAction";

type ConcreteActionFieldProps = Omit<TextInputProps, "description" | "label"> & {
  itemName?: string;
  label?: ReactNode;
  showLabel?: boolean;
  tourId?: string;
  tooltipExample?: string;
};

export function ConcreteActionField({
  itemName,
  label = "具体的手順",
  placeholder,
  showLabel = true,
  tourId,
  tooltipExample,
  ...props
}: ConcreteActionFieldProps) {
  const resolvedPlaceholder =
    placeholder ?? (itemName === undefined ? "例: 最初の一歩を具体的に書く" : undefined);
  const resolvedTooltip =
    tooltipExample ??
    "「〜を勉強する」ではなく、何をどうするかを書きます。例: アプリを開いて単語カードを10枚めくる";

  const resolvedLabel =
    showLabel && typeof label === "string" ? (
      <Group gap={4} wrap="nowrap">
        <Text span>{label}</Text>
        <Tooltip label={resolvedTooltip} multiline w={280}>
          <ActionIcon aria-label="具体的手順の書き方" size="xs" tabIndex={-1} variant="subtle">
            <IconInfoCircle aria-hidden size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    ) : (
      label
    );

  return (
    <TextInput
      {...props}
      data-onboarding-tour-id={tourId}
      description={CONCRETE_ACTION_VALIDATION_MESSAGE}
      label={showLabel ? resolvedLabel : label}
      placeholder={resolvedPlaceholder}
    />
  );
}
