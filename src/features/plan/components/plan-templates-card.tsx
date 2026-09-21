import {
  Field,
  FieldArray,
  Form,
  insert,
  remove,
  reset,
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
  Menu,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconCalendarCheck,
  IconCalendarOff,
  IconChevronDown,
  IconChevronUp,
  IconDotsVertical,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";
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
import { openPlanTemplateApplyConfirm } from "~/features/plan/lib/open-plan-template-apply-confirm";
import { openPlanTemplateRemoveConfirm } from "~/features/plan/lib/open-plan-template-remove-confirm";
import { openPlanTemplateUnapplyConfirm } from "~/features/plan/lib/open-plan-template-unapply-confirm";
import { formatPlanDateTooltip } from "~/features/plan/lib/plan-date-tooltip";
import { planDayScheduleEntries } from "~/features/plan/lib/plan-day-schedule-entries";
import { PLAN_PRIORITY_OPTIONS } from "~/features/plan/lib/plan-priority-style";
import {
  EMPTY_TEMPLATE_EVENT,
  NONE_ITEM_VALUE,
  PlanTemplateFormSchema,
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
export const FORGOTTEN_TEMPLATE_TOOLTIP_OFF = "予定への反映を忘れた時に、この計画を使用します";
export const FORGOTTEN_TEMPLATE_TOOLTIP_ON = "デフォルトの計画設定を解除します";
export const PLAN_TEMPLATE_ADDED_MESSAGE = "計画プリセットを追加しました";
export const PLAN_TEMPLATE_UPDATED_MESSAGE = "計画プリセットを更新しました";
export const PLAN_TEMPLATE_REMOVED_MESSAGE = "計画プリセットを削除しました";
export const PLAN_TEMPLATE_UNAPPLY_LABEL = "適用を解除";
export const PLAN_TEMPLATE_MENU_LABEL = "この計画の操作";
export const PLAN_TEMPLATE_DELETE_TOOLTIP = "この計画を削除します";
export const PLAN_TEMPLATE_ADD_EVENT_TOOLTIP = "この計画に予定を追加します";
export const PLAN_TEMPLATE_SAVE_TOOLTIP = "この計画を保存します";
export const PLAN_TEMPLATE_TITLE_OPEN_TOOLTIP = "この計画の予定を編集します";
export const PLAN_TEMPLATE_TITLE_CLOSE_TOOLTIP = "編集を閉じます";

export function planTemplateApplyTooltip(dateJst: DateJst) {
  return `${formatPlanDateTooltip(dateJst)} にこの計画を使用します`;
}

export function planTemplateUnapplyTooltip(dateJst: DateJst) {
  return `${formatPlanDateTooltip(dateJst)} のこの計画を外します`;
}

type PlanTemplatesCardProps = {
  appliedTemplateId?: Id<"planTemplates"> | null;
  dateJst: DateJst;
  events: readonly PlanEventDto[];
  externals: readonly PlanExternalEvent[];
  hasEvents: boolean;
  items: readonly PlanCatalogItem[];
  templates: readonly PlanTemplateDto[];
};

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

export function PlanTemplatesCard({
  appliedTemplateId,
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
  const [openTemplateIds, setOpenTemplateIds] = useState<ReadonlySet<Id<"planTemplates">>>(
    () => new Set(),
  );
  const [newEditorOpen, setNewEditorOpen] = useState(false);
  const [scheduleOpened, setScheduleOpened] = useState(false);
  const scheduleEntries = planDayScheduleEntries({
    dateJst,
    events,
    externals,
    items,
  });

  function toggleTemplateOpen(templateId: Id<"planTemplates">) {
    setOpenTemplateIds((current) => {
      const next = new Set(current);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  }

  async function persistRemove(templateId: Id<"planTemplates">) {
    const result = await runMutation(() => removeTemplate.mutateAsync({ templateId }), {
      successMessage: PLAN_TEMPLATE_REMOVED_MESSAGE,
    });
    if (Result.isOk(result)) {
      setOpenTemplateIds((current) => {
        const next = new Set(current);
        next.delete(templateId);
        return next;
      });
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

  function requestApply(template: PlanTemplateDto) {
    const apply = () => {
      void runMutation(() =>
        applyTemplate.mutateAsync({ dateJst, templateId: template._id, todayJst }),
      );
    };
    if (hasEvents) {
      openPlanTemplateApplyConfirm({
        dateJst,
        name: template.name,
        onConfirm: apply,
      });
      return;
    }
    apply();
  }

  function requestUnapply(template: PlanTemplateDto) {
    openPlanTemplateUnapplyConfirm({
      dateJst,
      name: template.name,
      onConfirm: () => {
        void runMutation(() => unapplyTemplate.mutateAsync({ dateJst, todayJst }));
      },
    });
  }

  return (
    <Card padding="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Title order={2}>計画プリセット</Title>
          <Group gap="xs" wrap="nowrap">
            <PlanDayScheduleHeaderButton
              dateJst={dateJst}
              onToggle={() => setScheduleOpened((current) => !current)}
              opened={scheduleOpened}
            />
            <PlanTemplateAddButton
              onClick={() => {
                setNewEditorOpen(true);
              }}
            />
          </Group>
        </Group>
        <PlanDayScheduleCollapsePanel entries={scheduleEntries} opened={scheduleOpened} />
        <Text c="dimmed" size="sm">
          忘れたときに使う1つを決めると、空の新しい日にその計画が入ります。
        </Text>
        {newEditorOpen ? (
          <PlanTemplateEditorCard
            items={items}
            onRemove={undefined}
            onSubmit={async (values) => {
              const result = await runMutation(
                () =>
                  saveTemplate.mutateAsync({
                    events: draftsFromOutput(values),
                    name: values.name,
                    templateId: undefined,
                  }),
                { successMessage: PLAN_TEMPLATE_ADDED_MESSAGE },
              );
              if (Result.isOk(result)) {
                setNewEditorOpen(false);
              }
              return result;
            }}
            template={null}
          />
        ) : null}
        {templates.length === 0 ? (
          <EmptyState
            description="7:00 の多読でも、項目なしの予定でも、同じ計画に載せられます。"
            icon={<IconTemplate aria-hidden />}
            title="計画プリセットはまだありません"
          />
        ) : (
          <Stack gap="xs">
            {templates.map((template) => {
              const detailsOpen = openTemplateIds.has(template._id);
              const isAppliedSource = appliedTemplateId === template._id;
              const applyTooltip = planTemplateApplyTooltip(dateJst);
              const unapplyTooltip = planTemplateUnapplyTooltip(dateJst);
              const titleTooltip = detailsOpen
                ? PLAN_TEMPLATE_TITLE_CLOSE_TOOLTIP
                : PLAN_TEMPLATE_TITLE_OPEN_TOOLTIP;

              return (
                <Card key={template._id} padding="sm" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between" wrap="nowrap">
                      <Group flex={1} gap={4} miw={0} wrap="nowrap">
                        <Box flex={1} miw={0}>
                          <Tooltip label={titleTooltip}>
                            <UnstyledButton
                              aria-expanded={detailsOpen}
                              aria-label={titleTooltip}
                              onClick={() => toggleTemplateOpen(template._id)}
                            >
                              <Text fw={600} lineClamp={1}>
                                {template.name}
                              </Text>
                            </UnstyledButton>
                          </Tooltip>
                        </Box>
                        <Tooltip label={titleTooltip}>
                          <ActionIcon
                            aria-expanded={detailsOpen}
                            aria-label={titleTooltip}
                            onClick={() => toggleTemplateOpen(template._id)}
                            type="button"
                            variant="subtle"
                          >
                            {detailsOpen ? (
                              <IconChevronUp aria-hidden size={16} stroke={1.5} />
                            ) : (
                              <IconChevronDown aria-hidden size={16} stroke={1.5} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                      <Group gap="xs" wrap="nowrap">
                        <PlanTemplateActions
                          applyTooltip={applyTooltip}
                          isAppliedSource={isAppliedSource}
                          onApply={() => requestApply(template)}
                          onUnapply={() => requestUnapply(template)}
                          unapplyTooltip={unapplyTooltip}
                        />
                        <PlanTemplateCardMenu
                          applyTooltip={applyTooltip}
                          isAppliedSource={isAppliedSource}
                          onApply={() => requestApply(template)}
                          onRemove={() => requestRemove(template)}
                          onUnapply={() => requestUnapply(template)}
                          unapplyTooltip={unapplyTooltip}
                        />
                        <Tooltip
                          label={
                            template.forgotten
                              ? FORGOTTEN_TEMPLATE_TOOLTIP_ON
                              : FORGOTTEN_TEMPLATE_TOOLTIP_OFF
                          }
                        >
                          <Switch
                            aria-label={FORGOTTEN_TEMPLATE_LABEL}
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
                        </Tooltip>
                      </Group>
                    </Group>
                    {detailsOpen ? (
                      <PlanTemplateEditorCard
                        items={items}
                        onRemove={() => requestRemove(template)}
                        onSubmit={async (values) => {
                          const result = await runMutation(
                            () =>
                              saveTemplate.mutateAsync({
                                events: draftsFromOutput(values),
                                name: values.name,
                                templateId: template._id,
                              }),
                            { successMessage: PLAN_TEMPLATE_UPDATED_MESSAGE },
                          );
                          if (Result.isOk(result)) {
                            toggleTemplateOpen(template._id);
                          }
                          return result;
                        }}
                        template={template}
                      />
                    ) : null}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function PlanTemplateActions({
  applyTooltip,
  isAppliedSource,
  onApply,
  onUnapply,
  unapplyTooltip,
}: {
  applyTooltip: string;
  isAppliedSource: boolean;
  onApply: () => void;
  onUnapply: () => void;
  unapplyTooltip: string;
}) {
  const isCompact = useMediaQuery("(max-width: 47.9375em)", false, {
    getInitialValueInEffect: true,
  });
  if (isCompact) {
    return null;
  }
  if (isAppliedSource) {
    return (
      <Tooltip label={unapplyTooltip}>
        <ActionIcon aria-label={unapplyTooltip} onClick={onUnapply} type="button" variant="light">
          <IconCalendarOff aria-hidden size={16} stroke={1.5} />
        </ActionIcon>
      </Tooltip>
    );
  }
  return (
    <Tooltip label={applyTooltip}>
      <ActionIcon aria-label={applyTooltip} onClick={onApply} type="button" variant="light">
        <IconCalendarCheck aria-hidden size={16} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
}

function PlanTemplateCardMenu({
  applyTooltip,
  isAppliedSource,
  onApply,
  onRemove,
  onUnapply,
  unapplyTooltip,
}: {
  applyTooltip: string;
  isAppliedSource: boolean;
  onApply: () => void;
  onRemove: () => void;
  onUnapply: () => void;
  unapplyTooltip: string;
}) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Tooltip label={PLAN_TEMPLATE_MENU_LABEL}>
          <ActionIcon aria-label={PLAN_TEMPLATE_MENU_LABEL} type="button" variant="subtle">
            <IconDotsVertical aria-hidden size={16} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        {isAppliedSource ? null : (
          <Tooltip label={applyTooltip}>
            <Menu.Item
              leftSection={<IconCalendarCheck aria-hidden size={16} stroke={1.5} />}
              onClick={onApply}
            >
              適用
            </Menu.Item>
          </Tooltip>
        )}
        {isAppliedSource ? (
          <Tooltip label={unapplyTooltip}>
            <Menu.Item
              leftSection={<IconCalendarOff aria-hidden size={16} stroke={1.5} />}
              onClick={onUnapply}
            >
              解除
            </Menu.Item>
          </Tooltip>
        ) : null}
        <Tooltip label={PLAN_TEMPLATE_DELETE_TOOLTIP}>
          <Menu.Item
            color="red"
            leftSection={<IconTrash aria-hidden size={16} stroke={1.5} />}
            onClick={onRemove}
          >
            削除
          </Menu.Item>
        </Tooltip>
      </Menu.Dropdown>
    </Menu>
  );
}

function PlanTemplateEditorCard({
  items,
  onRemove,
  onSubmit,
  template,
}: {
  items: readonly PlanCatalogItem[];
  onRemove?: () => void;
  onSubmit: (values: PlanTemplateFormOutput) => Promise<unknown>;
  template: PlanTemplateDto | null;
}) {
  const form = useForm({
    initialInput: editorInitialInput(template),
    schema: PlanTemplateFormSchema,
  });

  useEffect(() => {
    reset(form, {
      initialInput: editorInitialInput(template),
      keepInput: false,
    });
  }, [form, template]);

  return (
    <PlanTemplateEditor
      form={form}
      items={items}
      onRemove={onRemove}
      onSubmit={onSubmit}
      template={template}
    />
  );
}

function PlanTemplateEditor({
  form,
  items,
  onRemove,
  onSubmit,
  template,
}: {
  form: FormStore<typeof PlanTemplateFormSchema>;
  items: readonly PlanCatalogItem[];
  onRemove?: () => void;
  onSubmit: (values: PlanTemplateFormOutput) => Promise<unknown>;
  template: PlanTemplateDto | null;
}) {
  const itemOptions = itemSelectData(items);
  const name = template === null ? "新しい計画プリセット" : template.name;

  return (
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
                        <Field of={form} path={["events", index, "title"]}>
                          {(titleField) => {
                            const titleFilled = (titleField.input ?? "").trim() !== "";
                            const itemChosen = itemField.input !== NONE_ITEM_VALUE;
                            const showItem = !titleFilled;
                            const showTitle = !itemChosen || titleFilled;
                            return (
                              <>
                                {showItem ? (
                                  <Select
                                    {...itemField.props}
                                    allowDeselect={false}
                                    aria-label={`${name}の予定${index + 1}の項目`}
                                    clearButtonProps={{ "aria-label": "項目をクリア" }}
                                    clearable
                                    data={itemOptions}
                                    error={itemField.errors?.[0]}
                                    label={index === 0 ? "項目" : undefined}
                                    nothingFoundMessage="項目が見つかりません"
                                    onChange={(value) => {
                                      const next =
                                        value === null || value === "" ? NONE_ITEM_VALUE : value;
                                      itemField.onChange(next);
                                      if (next !== NONE_ITEM_VALUE) {
                                        titleField.onChange("");
                                      }
                                    }}
                                    searchable
                                    value={
                                      itemField.input === NONE_ITEM_VALUE ? null : itemField.input
                                    }
                                  />
                                ) : null}
                                {showTitle ? (
                                  <TextInput
                                    {...titleField.props}
                                    aria-label={`${name}の予定${index + 1}のタイトル`}
                                    error={titleField.errors?.[0]}
                                    label={index === 0 ? "タイトル" : undefined}
                                    mt={showItem ? "sm" : undefined}
                                    onChange={(event) => {
                                      const value = event.currentTarget.value;
                                      titleField.onChange(value);
                                      if (value.trim() !== "") {
                                        itemField.onChange(NONE_ITEM_VALUE);
                                      }
                                    }}
                                    value={titleField.input}
                                  />
                                ) : null}
                              </>
                            );
                          }}
                        </Field>
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
        <Group justify="space-between" wrap="wrap">
          <Tooltip label={PLAN_TEMPLATE_ADD_EVENT_TOOLTIP}>
            <Button
              aria-label={PLAN_TEMPLATE_ADD_EVENT_TOOLTIP}
              onClick={() => {
                insert(form, { initialInput: EMPTY_TEMPLATE_EVENT, path: ["events"] });
              }}
              type="button"
              variant="light"
            >
              予定を追加
            </Button>
          </Tooltip>
          <Group gap="xs" wrap="nowrap">
            {onRemove === undefined ? null : (
              <Tooltip label={PLAN_TEMPLATE_DELETE_TOOLTIP}>
                <Button
                  aria-label={PLAN_TEMPLATE_DELETE_TOOLTIP}
                  color="red"
                  onClick={onRemove}
                  type="button"
                  variant="light"
                >
                  削除
                </Button>
              </Tooltip>
            )}
            <Tooltip label={PLAN_TEMPLATE_SAVE_TOOLTIP}>
              <Button aria-label={PLAN_TEMPLATE_SAVE_TOOLTIP} type="submit">
                保存
              </Button>
            </Tooltip>
          </Group>
        </Group>
      </Stack>
    </Form>
  );
}
