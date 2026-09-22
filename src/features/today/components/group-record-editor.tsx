import { Field, Form, reset, useForm, validate } from "@formisch/react";
import {
  ActionIcon,
  Badge,
  Grid,
  Group,
  Input,
  NumberInput,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { useFocusWithin } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconArrowBackUp, IconPlayerSkipForward } from "@tabler/icons-react";
import { Result } from "better-result";
import { useEffect, type ChangeEvent } from "react";
import { concreteActionPlaceholder } from "~domain/concreteActionCore";

import { ConcreteActionFieldWithSuggestions } from "~/components/concrete-action-field-with-suggestions";
import {
  DAY_GROUP_CONFIRMED_STATUS,
  DAY_GROUP_INCOMPLETE_STATUS,
  DAY_GROUP_SKIPPED_STATUS,
  DAY_GROUP_STATUS_UI,
  dayGroupCounts,
  dayGroupStatus,
  duplicateRecordBadgeLabel,
  sharedRowContent,
  type DayRowGroup,
} from "~/features/today/lib/group-day-rows";
import { GroupRecordContentSchema } from "~/features/today/schemas/group-record-schema";
import type { ConfirmRowInput, SkipRowInput } from "~/features/today/types/mutations";
import type { MutationResult } from "~/lib/run-mutation";
import { NUMERAL_FONT } from "~/lib/theme";

type GroupRecordEditorProps = {
  disabled?: boolean;
  group: DayRowGroup;
  onConfirmMany: (inputs: ConfirmRowInput[]) => Promise<MutationResult>;
  onSkipMany: (rowIds: SkipRowInput["rowId"][]) => void;
  onUnskipMany: (rowIds: SkipRowInput["rowId"][]) => void;
};

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function GroupStatusSwitch({
  checked,
  disabled,
  onChange,
  statusLabel,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  statusLabel: string;
}) {
  return (
    <Tooltip label={statusLabel} refProp="rootRef">
      <Switch
        aria-label="記録を確定"
        checked={checked}
        color="green"
        disabled={disabled}
        offLabel={<XIcon />}
        onChange={onChange}
        onLabel={<CheckIcon />}
        size="md"
      />
    </Tooltip>
  );
}

function requestSkipGroup(onConfirm: () => void) {
  modals.openConfirmModal({
    children: "この項目の記録をすべて学習量から外します。",
    confirmProps: { color: "yellow" },
    labels: { cancel: "キャンセル", confirm: "見送りにする" },
    onConfirm,
    title: "見送りにしますか？",
  });
}

function requestUnskipGroup(onConfirm: () => void) {
  modals.openConfirmModal({
    children: "この項目の見送りをすべて未着手に戻します。",
    labels: { cancel: "キャンセル", confirm: "見送りを取り消す" },
    onConfirm,
    title: "見送りを取り消しますか？",
  });
}

function confirmInputs(group: DayRowGroup, content: string | null): ConfirmRowInput[] {
  return group.rows.map((row) => ({
    content: content ?? row.content,
    minutes: row.minutes,
    rowId: row._id,
  }));
}

export function GroupRecordEditor({
  disabled = false,
  group,
  onConfirmMany,
  onSkipMany,
  onUnskipMany,
}: GroupRecordEditorProps) {
  const sharedContent = sharedRowContent(group.rows);
  const status = dayGroupStatus(group.rows);
  const counts = dayGroupCounts(group.rows);
  const badge = DAY_GROUP_STATUS_UI[status];
  const isDone = status === DAY_GROUP_CONFIRMED_STATUS;
  const canSkipDirectly = status === DAY_GROUP_INCOMPLETE_STATUS;
  const canUnskip = status === DAY_GROUP_SKIPPED_STATUS;
  const form = useForm({
    initialInput: { content: sharedContent ?? "" },
    schema: GroupRecordContentSchema,
  });

  async function readSharedContent(): Promise<string | null> {
    if (sharedContent === null) {
      return null;
    }
    const result = await validate(form);
    if (!result.success) {
      return sharedContent;
    }
    return result.output.content;
  }

  async function confirmGroup() {
    const content = await readSharedContent();
    return onConfirmMany(confirmInputs(group, content));
  }

  async function saveIfConfirmedDirty() {
    if (status !== DAY_GROUP_CONFIRMED_STATUS || sharedContent === null) {
      return;
    }
    const content = await readSharedContent();
    if (content === null || content === sharedContent) {
      return;
    }
    const result = await onConfirmMany(confirmInputs(group, content));
    if (Result.isOk(result)) {
      reset(form, { initialInput: { content }, keepInput: true });
    }
  }

  const { ref: rowRef } = useFocusWithin({
    onBlur: () => {
      void saveIfConfirmedDirty();
    },
  });

  useEffect(() => {
    if (form.isDirty || sharedContent === null) {
      return;
    }
    reset(form, { initialInput: { content: sharedContent } });
  }, [form, sharedContent]);

  const title = (
    <Group component="span" gap={6} wrap="wrap">
      <span>{group.itemName}</span>
      <Badge
        color={counts.incompleteCount > 0 || status === DAY_GROUP_SKIPPED_STATUS ? "gray" : "green"}
        size="sm"
        variant="light"
      >
        {duplicateRecordBadgeLabel(counts)}
      </Badge>
      <Text component="span" ff={NUMERAL_FONT} fw={600} size="sm">
        合計 {group.totalMinutes}分
      </Text>
    </Group>
  );

  const rowIds: SkipRowInput["rowId"][] = [];
  const skippedIds: SkipRowInput["rowId"][] = [];
  for (const row of group.rows) {
    rowIds.push(row._id);
    if (row.status === "スキップ") {
      skippedIds.push(row._id);
    }
  }

  const statusControls = (
    <Input.Wrapper label="状態">
      <Group gap="sm" wrap="nowrap">
        <GroupStatusSwitch
          checked={isDone}
          disabled={disabled}
          onChange={(event) => {
            if (event.currentTarget.checked) {
              event.currentTarget.closest("form")?.requestSubmit();
              return;
            }
            if (status === DAY_GROUP_CONFIRMED_STATUS) {
              requestSkipGroup(() => onSkipMany(rowIds));
            }
          }}
          statusLabel={badge.label}
        />
        {canSkipDirectly ? (
          <Tooltip label="見送りにする">
            <ActionIcon
              aria-label="見送りにする"
              color="yellow"
              disabled={disabled}
              onClick={() => requestSkipGroup(() => onSkipMany(rowIds))}
              size="lg"
              type="button"
              variant="light"
            >
              <IconPlayerSkipForward aria-hidden size={16} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        ) : null}
        {canUnskip ? (
          <Tooltip label="見送りを取り消す">
            <ActionIcon
              aria-label="見送りを取り消す"
              color="gray"
              disabled={disabled}
              onClick={() => requestUnskipGroup(() => onUnskipMany(skippedIds))}
              size="lg"
              type="button"
              variant="light"
            >
              <IconArrowBackUp aria-hidden size={16} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        ) : null}
        <Badge
          color={badge.color}
          style={{ transform: isDone ? "rotate(-3deg)" : "rotate(2deg)" }}
          variant="outline"
        >
          {badge.label}
        </Badge>
      </Group>
    </Input.Wrapper>
  );

  const minutesInput = (
    <NumberInput disabled label="分数" min={0} readOnly value={group.totalMinutes} />
  );

  return (
    <Form
      aria-label={`${group.itemName}の記録`}
      of={form}
      onSubmit={() => {
        void confirmGroup();
      }}
    >
      <div ref={rowRef}>
        <Grid align="flex-start" gap="sm">
          <Grid.Col span={{ base: 12, sm: 5 }}>
            {sharedContent === null ? (
              <Input.Wrapper label={title} />
            ) : (
              <Field of={form} path={["content"]}>
                {(field) => (
                  <ConcreteActionFieldWithSuggestions
                    {...field.props}
                    aria-label={`${group.itemName}のひとこと`}
                    disabled={disabled}
                    error={field.errors?.[0]}
                    itemId={group.itemId}
                    itemName={group.itemName}
                    label={title}
                    onBlur={(event) => {
                      field.props.onBlur?.(event);
                      void saveIfConfirmedDirty();
                    }}
                    onValueChange={(value) => field.onChange(value)}
                    placeholder={concreteActionPlaceholder(group.itemName)}
                    value={field.input}
                    wrapLabel={false}
                  />
                )}
              </Field>
            )}
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 2 }}>{minutesInput}</Grid.Col>
          <Grid.Col span={{ base: 6, sm: 5 }}>{statusControls}</Grid.Col>
        </Grid>
      </div>
    </Form>
  );
}
