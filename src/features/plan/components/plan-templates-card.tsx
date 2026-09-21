import {
  Field,
  FieldArray,
  Form,
  getInput,
  insert,
  remove,
  reset,
  setInput,
  useForm,
  type FormStore,
} from "@formisch/react";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  ColorSwatch,
  EmptyState,
  Grid,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { IconChevronDown, IconChevronUp, IconTemplate, IconTrash } from "@tabler/icons-react";
import { Result } from "better-result";
import { useEffect, useState } from "react";
import type { DateJst } from "~domain/jst";
import type { PlanPriority } from "~domain/planEvent";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  PlanDayScheduleCollapsePanel,
  PlanDayScheduleHeaderButton,
  PlanTemplateAddButton,
} from "~/features/plan/components/plan-day-schedule-list";
import {
  usePlanTemplateApply,
  usePlanTemplateRemove,
  usePlanTemplateSave,
  usePlanTemplateSetForgotten,
  usePlanTemplateUnapply,
} from "~/features/plan/hooks/plan-mutations";
import { openPlanTemplateRemoveConfirm } from "~/features/plan/lib/open-plan-template-remove-confirm";
import { planDayScheduleEntries } from "~/features/plan/lib/plan-day-schedule-entries";
import { planEventDisplayName } from "~/features/plan/lib/plan-event-display-name";
import { PLAN_PRIORITY_OPTIONS } from "~/features/plan/lib/plan-priority-style";
import {
  EMPTY_TEMPLATE_EVENT,
  NONE_ITEM_VALUE,
  PlanTemplateFormSchema,
  type PlanTemplateEventFormInput,
  type PlanTemplateFormInput,
  type PlanTemplateFormOutput,
} from "~/features/plan/schemas/plan-template-schema";
import type {
  PlanCatalogItem,
  PlanEventDto,
  PlanExternalEvent,
  PlanTemplateDto,
} from "~/features/plan/types/plan";
import { useTodayJst } from "~/hooks/use-today-jst";
import { runMutation } from "~/lib/run-mutation";
import { onRequiredSelect } from "~/lib/select";
import { parseItemId, unwrapItemId } from "~/types/item";

export const FORGOTTEN_TEMPLATE_LABEL = "計画し忘れたときに使う";
export const PLAN_TEMPLATE_ADDED_MESSAGE = "計画プリセットを追加しました";
export const PLAN_TEMPLATE_UPDATED_MESSAGE = "計画プリセットを更新しました";
export const PLAN_TEMPLATE_REMOVED_MESSAGE = "計画プリセットを削除しました";
export const PLAN_TEMPLATE_UNAPPLY_LABEL = "適用を解除";

type PlanTemplatesCardProps = {
  dateJst: DateJst;
  events: readonly PlanEventDto[];
  externals: readonly PlanExternalEvent[];
  hasEvents: boolean;
  items: readonly PlanCatalogItem[];
  templates: readonly PlanTemplateDto[];
};

type Editing = { kind: "new" } | { kind: "saved"; template: PlanTemplateDto };

function parseOptionalItemId(value: string): Id<"items"> | undefined {
  if (value === NONE_ITEM_VALUE) {
    return undefined;
  }
  return unwrapItemId(parseItemId(value));
}

function draftsFromOutput(output: PlanTemplateFormOutput) {
  return output.events.map((event) => ({
    endTime: event.endTime,
    itemId: parseOptionalItemId(event.itemId),
    priority: event.priority,
    startTime: event.startTime,
    templateEventId:
      event.templateEventId === undefined || event.templateEventId === ""
        ? undefined
        : (event.templateEventId as Id<"planTemplateEvents">),
    title: event.title,
  }));
}

function editorInitialInput(template: PlanTemplateDto | null): PlanTemplateFormInput {
  if (template === null) {
    return { events: [], name: "" };
  }
  return {
    events: template.events.map((event) => ({
      endTime: event.endTime,
      itemId: event.itemId ?? NONE_ITEM_VALUE,
      priority: event.priority,
      startTime: event.startTime,
      templateEventId: event._id,
      title: event.title,
    })),
    name: template.name,
  };
}

function itemSelectData(items: readonly PlanCatalogItem[]) {
  return [
    { label: "なし（記録は作らない）", value: NONE_ITEM_VALUE },
    ...items.map((item) => ({ label: item.name, value: item._id })),
  ];
}

function renderPriorityOption(priority: (typeof PLAN_PRIORITY_OPTIONS)[number]) {
  return (
    <Group gap="xs" wrap="nowrap">
      <ColorSwatch color={priority.hex} size={16} />
      <span>{priority.label}</span>
    </Group>
  );
}

function templateSummary(template: PlanTemplateDto, items: readonly PlanCatalogItem[]) {
  if (template.events.length === 0) {
    return "予定なし";
  }
  return template.events
    .map(
      (event) =>
        `${event.startTime}–${event.endTime} ${planEventDisplayName(event.title, event.itemId, items)}`,
    )
    .join("、");
}

export function PlanTemplatesCard({
  dateJst,
  events,
  externals,
  hasEvents,
  items,
  templates,
}: PlanTemplatesCardProps) {
  const todayJst = useTodayJst();
  const saveTemplate = usePlanTemplateSave();
  const removeTemplate = usePlanTemplateRemove();
  const setForgotten = usePlanTemplateSetForgotten();
  const applyTemplate = usePlanTemplateApply();
  const unapplyTemplate = usePlanTemplateUnapply();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [scheduleOpened, setScheduleOpened] = useState(false);
  const form = useForm({
    initialInput: { events: [], name: "" },
    schema: PlanTemplateFormSchema,
  });
  const applyId = editing?.kind === "saved" ? editing.template._id : undefined;
  const draftTemplateEvents =
    editing === null ? undefined : (getInput(form).events as PlanTemplateEventFormInput[]);
  const scheduleEntries = planDayScheduleEntries({
    dateJst,
    draftTemplateEvents,
    events,
    externals,
    items,
  });

  useEffect(() => {
    if (editing === null) {
      return;
    }
    reset(form, {
      initialInput: editorInitialInput(editing.kind === "saved" ? editing.template : null),
      keepInput: false,
    });
  }, [editing, form]);

  async function persistRemove(templateId: Id<"planTemplates">) {
    const result = await runMutation(() => removeTemplate.mutateAsync({ templateId }), {
      successMessage: PLAN_TEMPLATE_REMOVED_MESSAGE,
    });
    if (Result.isOk(result)) {
      setEditing((current) =>
        current?.kind === "saved" && current.template._id === templateId ? null : current,
      );
    }
    return result;
  }

  function requestRemove(template: PlanTemplateDto) {
    openPlanTemplateRemoveConfirm({
      name: template.name,
      onConfirm: () => {
        void persistRemove(template._id);
      },
    });
  }

  function toggleEditing(template: PlanTemplateDto) {
    setEditing((current) =>
      current?.kind === "saved" && current.template._id === template._id
        ? null
        : { kind: "saved", template },
    );
  }

  return (
    <Card padding="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Title order={2}>計画プリセット</Title>
          <Group gap="xs" wrap="nowrap">
            <PlanDayScheduleHeaderButton
              onToggle={() => setScheduleOpened((current) => !current)}
              opened={scheduleOpened}
            />
            <PlanTemplateAddButton onClick={() => setEditing({ kind: "new" })} />
          </Group>
        </Group>
        <PlanDayScheduleCollapsePanel entries={scheduleEntries} opened={scheduleOpened} />
        <Text c="dimmed" size="sm">
          予定の雛形です。忘れたときに使う1つを決めると、予定のない今日に展開されます。
        </Text>
        {templates.length === 0 ? (
          <EmptyState
            description="7:00 の多読でも、項目なしの予定でも、同じ雛形に載せられます。"
            icon={<IconTemplate aria-hidden />}
            title="計画プリセットはまだありません"
          />
        ) : (
          <Stack gap="xs">
            {templates.map((template) => {
              const detailsOpen =
                editing?.kind === "saved" && editing.template._id === template._id;
              return (
                <Card key={template._id} padding="sm" withBorder>
                  <Group justify="space-between" wrap="nowrap">
                    <Group flex={1} gap={4} miw={0} wrap="nowrap">
                      <Box flex={1} miw={0}>
                        <UnstyledButton
                          aria-expanded={detailsOpen}
                          aria-label={`${template.name}を編集`}
                          onClick={() => toggleEditing(template)}
                        >
                          <Stack gap={2}>
                            <Text fw={600} lineClamp={1}>
                              {template.name}
                            </Text>
                            <Text c="dimmed" lineClamp={2} size="sm">
                              {templateSummary(template, items)}
                            </Text>
                          </Stack>
                        </UnstyledButton>
                      </Box>
                      <ActionIcon
                        aria-expanded={detailsOpen}
                        aria-label={
                          detailsOpen
                            ? `${template.name}の詳細を閉じる`
                            : `${template.name}の詳細を開く`
                        }
                        onClick={() => toggleEditing(template)}
                        type="button"
                        variant="subtle"
                      >
                        {detailsOpen ? (
                          <IconChevronUp aria-hidden size={16} stroke={1.5} />
                        ) : (
                          <IconChevronDown aria-hidden size={16} stroke={1.5} />
                        )}
                      </ActionIcon>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                      <Button
                        aria-label={`${template.name}を削除`}
                        color="red"
                        onClick={() => {
                          requestRemove(template);
                        }}
                        type="button"
                        variant="subtle"
                      >
                        削除
                      </Button>
                      <Switch
                        checked={template.forgotten}
                        label={FORGOTTEN_TEMPLATE_LABEL}
                        onChange={() => {
                          void runMutation(() =>
                            setForgotten.mutateAsync({
                              templateId: template.forgotten ? null : template._id,
                            }),
                          );
                        }}
                      />
                    </Group>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        )}
        <Group gap="xs" wrap="wrap">
          <Button
            disabled={hasEvents || applyId === undefined}
            onClick={() => {
              if (applyId === undefined) {
                return;
              }
              void runMutation(() =>
                applyTemplate.mutateAsync({ dateJst, templateId: applyId, todayJst }),
              );
            }}
          >
            この日に適用
          </Button>
          {hasEvents ? (
            <Button
              onClick={() => {
                void runMutation(() => unapplyTemplate.mutateAsync({ dateJst, todayJst }));
              }}
              type="button"
              variant="light"
            >
              {PLAN_TEMPLATE_UNAPPLY_LABEL}
            </Button>
          ) : null}
        </Group>
        {hasEvents ? (
          <Text c="dimmed" size="sm">
            この日にはすでに予定があるので、雛形は適用しません。
          </Text>
        ) : null}
        {editing === null ? null : (
          <PlanTemplateEditor
            editing={editing}
            form={form}
            items={items}
            onRemove={
              editing.kind === "new"
                ? undefined
                : () => {
                    requestRemove(editing.template);
                  }
            }
            onSubmit={async (values) => {
              const result = await runMutation(
                () =>
                  saveTemplate.mutateAsync({
                    events: draftsFromOutput(values),
                    name: values.name,
                    templateId: editing.kind === "saved" ? editing.template._id : undefined,
                  }),
                {
                  successMessage:
                    editing.kind === "new"
                      ? PLAN_TEMPLATE_ADDED_MESSAGE
                      : PLAN_TEMPLATE_UPDATED_MESSAGE,
                },
              );
              if (Result.isOk(result)) {
                setEditing(null);
              }
              return result;
            }}
          />
        )}
      </Stack>
    </Card>
  );
}

function PlanTemplateEditor({
  editing,
  form,
  items,
  onRemove,
  onSubmit,
}: {
  editing: Editing;
  form: FormStore<typeof PlanTemplateFormSchema>;
  items: readonly PlanCatalogItem[];
  onRemove?: () => void;
  onSubmit: (values: PlanTemplateFormOutput) => Promise<unknown>;
}) {
  const itemOptions = itemSelectData(items);
  const name = editing.kind === "saved" ? editing.template.name : "新しい計画プリセット";

  return (
    <Card padding="md" withBorder>
      <Form
        of={form}
        onSubmit={(output) => {
          void onSubmit(output);
        }}
      >
        <Stack gap="sm">
          <Field of={form} path={["name"]}>
            {(field) => (
              <TextInput
                {...field.props}
                aria-label={`${name}の名前`}
                error={field.errors?.[0]}
                label="名前"
                value={field.input}
              />
            )}
          </Field>
          <FieldArray of={form} path={["events"]}>
            {(fieldArray) => (
              <Stack gap="sm">
                {fieldArray.items.map((itemKey, index) => (
                  <Grid key={itemKey} align="flex-start" gap="sm">
                    <Grid.Col span={{ base: 12, sm: 3 }}>
                      <Field of={form} path={["events", index, "itemId"]}>
                        {(itemField) => (
                          <>
                            <Select
                              {...itemField.props}
                              aria-label={`${name}の予定${index + 1}の項目`}
                              data={itemOptions}
                              error={itemField.errors?.[0]}
                              label={index === 0 ? "項目" : undefined}
                              onChange={onRequiredSelect((value) => {
                                itemField.onChange(value);
                                if (value !== NONE_ITEM_VALUE) {
                                  setInput(form, { input: "", path: ["events", index, "title"] });
                                }
                              })}
                              value={itemField.input}
                            />
                            {itemField.input === NONE_ITEM_VALUE ? (
                              <Field of={form} path={["events", index, "title"]}>
                                {(field) => (
                                  <TextInput
                                    {...field.props}
                                    aria-label={`${name}の予定${index + 1}のタイトル`}
                                    error={field.errors?.[0]}
                                    label={index === 0 ? "タイトル" : undefined}
                                    mt="sm"
                                    value={field.input}
                                  />
                                )}
                              </Field>
                            ) : null}
                          </>
                        )}
                      </Field>
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, sm: 2 }}>
                      <Field of={form} path={["events", index, "startTime"]}>
                        {(field) => (
                          <TimeInput
                            {...field.props}
                            aria-label={`${name}の予定${index + 1}の開始`}
                            error={field.errors?.[0]}
                            label={index === 0 ? "開始" : undefined}
                            onChange={(event) => {
                              field.onChange(event.currentTarget.value);
                            }}
                            value={field.input}
                          />
                        )}
                      </Field>
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, sm: 2 }}>
                      <Field of={form} path={["events", index, "endTime"]}>
                        {(field) =>
                          field.input === "24:00" ? (
                            <TextInput
                              {...field.props}
                              aria-label={`${name}の予定${index + 1}の終了`}
                              error={field.errors?.[0]}
                              label={index === 0 ? "終了" : undefined}
                              onChange={(event) => {
                                field.onChange(event.currentTarget.value);
                              }}
                              value={field.input}
                            />
                          ) : (
                            <TimeInput
                              {...field.props}
                              aria-label={`${name}の予定${index + 1}の終了`}
                              error={field.errors?.[0]}
                              label={index === 0 ? "終了" : undefined}
                              onChange={(event) => {
                                field.onChange(event.currentTarget.value);
                              }}
                              value={field.input}
                            />
                          )
                        }
                      </Field>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 2 }}>
                      <Field of={form} path={["events", index, "priority"]}>
                        {(field) => (
                          <Select
                            {...field.props}
                            aria-label={`${name}の予定${index + 1}の優先度`}
                            data={PLAN_PRIORITY_OPTIONS.map((priority) => ({
                              label: priority.label,
                              value: priority.value,
                            }))}
                            error={field.errors?.[0]}
                            label={index === 0 ? "優先度" : undefined}
                            onChange={onRequiredSelect((value) => {
                              field.onChange(value as PlanPriority);
                            })}
                            renderOption={({ option }) => {
                              const priority = PLAN_PRIORITY_OPTIONS.find(
                                (entry) => entry.value === option.value,
                              );
                              return priority === undefined
                                ? option.label
                                : renderPriorityOption(priority);
                            }}
                            value={field.input}
                          />
                        )}
                      </Field>
                    </Grid.Col>
                    <Grid.Col span={{ base: 2, sm: 1 }}>
                      <ActionIcon
                        aria-label={`${name}の予定${index + 1}を外す`}
                        color="red"
                        mt={index === 0 ? 24 : 0}
                        onClick={() => {
                          remove(form, { at: index, path: ["events"] });
                        }}
                        type="button"
                        variant="white"
                      >
                        <IconTrash aria-hidden size={16} stroke={1.5} />
                      </ActionIcon>
                    </Grid.Col>
                  </Grid>
                ))}
              </Stack>
            )}
          </FieldArray>
          <Group>
            <Button
              onClick={() => {
                insert(form, { initialInput: EMPTY_TEMPLATE_EVENT, path: ["events"] });
              }}
              type="button"
              variant="light"
            >
              予定を足す
            </Button>
            <Button type="submit">保存</Button>
            {onRemove === undefined ? null : (
              <Button color="red" onClick={onRemove} type="button" variant="light">
                削除
              </Button>
            )}
          </Group>
        </Stack>
      </Form>
    </Card>
  );
}
