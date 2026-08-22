import { Field, Form, reset, useForm } from "@formisch/react";
import { ActionIcon, Badge, Grid, Group, Input, NumberInput, Switch, Tooltip } from "@mantine/core";
import { useFocusWithin } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconArrowBackUp, IconPlayerSkipForward, IconTrash } from "@tabler/icons-react";
import { useEffect, type ChangeEvent } from "react";
import { concreteActionPlaceholder } from "~domain/concreteActionCore";

import { ConcreteActionFieldWithSuggestions } from "~/components/concrete-action-field-with-suggestions";
import { validateConfirmRow } from "~/features/today/lib/validate-confirm-row";
import type { DayRow } from "~/features/today/types/day";
import type {
  ConfirmRowInput,
  RemoveRowInput,
  SkipRowInput,
} from "~/features/today/types/mutations";
import { RECORD_STATUS_UI, statusTooltip } from "~/lib/record-status-ui";
import { RowEditorSchema } from "~/lib/validation/row-editor-schema";

type RowEditorProps = {
  disabled?: boolean;
  onConfirm: (input: ConfirmRowInput) => void;
  onRemove: (rowId: RemoveRowInput["rowId"]) => void;
  onSkip: (rowId: SkipRowInput["rowId"]) => void;
  onUnskip: (rowId: SkipRowInput["rowId"]) => void;
  row: DayRow;
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

function RowStatusSwitch({
  checked,
  disabled,
  onChange,
  status,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  status: DayRow["status"];
}) {
  return (
    <Tooltip label={statusTooltip(status)} refProp="rootRef">
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

function requestSkip(rowId: SkipRowInput["rowId"], onSkip: (rowId: SkipRowInput["rowId"]) => void) {
  modals.openConfirmModal({
    children: "学習量からは外れます。",
    confirmProps: { color: "yellow" },
    labels: { cancel: "キャンセル", confirm: "見送りにする" },
    onConfirm: () => onSkip(rowId),
    title: "見送りにしますか？",
  });
}

function requestUnskip(
  rowId: SkipRowInput["rowId"],
  onUnskip: (rowId: SkipRowInput["rowId"]) => void,
) {
  modals.openConfirmModal({
    children: "未着手に戻します。",
    labels: { cancel: "キャンセル", confirm: "見送りを取り消す" },
    onConfirm: () => onUnskip(rowId),
    title: "見送りを取り消しますか？",
  });
}

export function RowEditor({
  disabled = false,
  onConfirm,
  onRemove,
  onSkip,
  onUnskip,
  row,
}: RowEditorProps) {
  const form = useForm({
    initialInput: { content: row.content, minutes: row.minutes },
    schema: RowEditorSchema,
  });
  const isDone = row.status === "確定";
  const canSkipDirectly = row.status === "未着手" || row.status === "進行中";
  const canUnskip = row.status === "スキップ";
  const badge = RECORD_STATUS_UI[row.status];

  async function saveIfConfirmedDirty() {
    if (row.status !== "確定") {
      return;
    }
    const output = await validateConfirmRow(form);
    if (output === null) {
      return;
    }
    if (output.content === row.content && output.minutes === row.minutes) {
      return;
    }
    onConfirm({ content: output.content, minutes: output.minutes, rowId: row._id });
    reset(form, { initialInput: output, keepInput: true });
  }

  const { ref: rowRef } = useFocusWithin({
    onBlur: () => {
      void saveIfConfirmedDirty();
    },
  });

  useEffect(() => {
    if (form.isDirty) {
      return;
    }
    reset(form, { initialInput: { content: row.content, minutes: row.minutes } });
  }, [form, row.content, row.minutes]);

  return (
    <Form
      aria-label={`${row.itemName}の記録`}
      of={form}
      onSubmit={async () => {
        const output = await validateConfirmRow(form);
        if (output === null) {
          return;
        }
        onConfirm({ content: output.content, minutes: output.minutes, rowId: row._id });
      }}
    >
      <div ref={rowRef}>
        <Grid align="flex-start" gap="sm">
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <Field of={form} path={["content"]}>
              {(field) => (
                <ConcreteActionFieldWithSuggestions
                  {...field.props}
                  aria-label={`${row.itemName}のひとこと`}
                  disabled={disabled}
                  error={field.errors?.[0]}
                  itemId={row.itemId}
                  itemName={row.itemName}
                  label={row.itemName}
                  onBlur={(event) => {
                    field.props.onBlur?.(event);
                    void saveIfConfirmedDirty();
                  }}
                  onValueChange={(value) => field.onChange(value)}
                  placeholder={concreteActionPlaceholder(row.itemName)}
                  value={field.input}
                  wrapLabel={false}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 2 }}>
            <Field of={form} path={["minutes"]}>
              {(field) => (
                <NumberInput
                  {...field.props}
                  disabled={disabled}
                  error={field.errors?.[0]}
                  label="分数"
                  min={0}
                  onBlur={(event) => {
                    field.props.onBlur?.(event);
                    void saveIfConfirmedDirty();
                  }}
                  onChange={(value) => field.onChange(typeof value === "number" ? value : 0)}
                  value={field.input}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 5 }}>
            <Input.Wrapper label="状態">
              <Group gap="sm" wrap="nowrap">
                <RowStatusSwitch
                  checked={isDone}
                  disabled={disabled}
                  onChange={(event) => {
                    if (event.currentTarget.checked) {
                      event.currentTarget.closest("form")?.requestSubmit();
                      return;
                    }
                    if (row.status === "確定") {
                      requestSkip(row._id, onSkip);
                    }
                  }}
                  status={row.status}
                />
                {canSkipDirectly ? (
                  <Tooltip label="見送りにする">
                    <ActionIcon
                      aria-label="見送りにする"
                      color="yellow"
                      disabled={disabled}
                      onClick={() => requestSkip(row._id, onSkip)}
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
                      onClick={() => requestUnskip(row._id, onUnskip)}
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
                <Tooltip label="ゴミ箱へ">
                  <ActionIcon
                    aria-label="ゴミ箱へ"
                    color="red"
                    disabled={disabled}
                    onClick={() => onRemove(row._id)}
                    size="lg"
                    type="button"
                    variant="white"
                  >
                    <IconTrash aria-hidden size={16} stroke={1.5} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Input.Wrapper>
          </Grid.Col>
        </Grid>
      </div>
    </Form>
  );
}
