import { Button, Card, Grid, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { Result } from "better-result";
import { useState } from "react";
import { PLAN_PRIORITY_STYLE } from "~domain/planEvent";

import {
  BoardScheduleEventForm,
  blockFormValues,
  slotFormValues,
} from "~/features/plan/components/board-schedule-event-form";
import { PlanClock } from "~/features/plan/components/plan-clock";
import { useBoardScheduleActions } from "~/features/plan/hooks/use-board-schedule-actions";
import { usePlanView } from "~/features/plan/hooks/use-plan-view";
import { usePlanWindow } from "~/features/plan/hooks/use-plan-window";
import {
  DEFAULT_DAY_BLOCK_END,
  DEFAULT_DAY_BLOCK_START,
} from "~/features/plan/lib/board-schedule-layout";
import { toPlanScheduleBlocks } from "~/features/plan/lib/plan-event-blocks";
import { instantsToPlanTimes } from "~/features/plan/lib/plan-event-instants";
import type { PlanScheduleEventInput } from "~/features/plan/schemas/board-schedule-event-schema";
import { useItemsList } from "~/hooks/use-items-list";

export function PlanListTab() {
  const view = usePlanView();
  const { events, unplannedConfirmedMinutes } = usePlanWindow(view.selectedDateJst, "day");
  const { data: items } = useItemsList();
  const actions = useBoardScheduleActions();
  const blocks = toPlanScheduleBlocks(events);
  const [formOpened, setFormOpened] = useState(false);
  const [formValues, setFormValues] = useState<PlanScheduleEventInput | null>(null);
  const editingId = formValues?.eventId;
  const editing =
    editingId === undefined ? undefined : blocks.find((block) => block._id === editingId);

  return (
    <Grid align="flex-start" gap="md">
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Stack gap="md">
          <DatePicker
            aria-label="日付を選択"
            onChange={(value) => {
              if (typeof value === "string") {
                view.setDate(value);
              }
            }}
            value={view.selectedDateJst}
          />
          <Button onClick={() => view.setDate(view.today)} variant="light">
            今日
          </Button>
          <PlanClock
            events={events}
            selectedDateJst={view.selectedDateJst}
            todayJst={view.today}
            unplannedConfirmedMinutes={unplannedConfirmedMinutes}
          />
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 7 }}>
        <Stack gap="md">
          <Button
            onClick={() => {
              setFormValues(
                slotFormValues(
                  `${view.selectedDateJst} ${DEFAULT_DAY_BLOCK_START}`,
                  `${view.selectedDateJst} ${DEFAULT_DAY_BLOCK_END}`,
                ),
              );
              setFormOpened(true);
            }}
          >
            予定を追加
          </Button>
          {blocks.length === 0 ? (
            <Text c="dimmed" size="sm">
              この日の予定はまだありません。
            </Text>
          ) : (
            <Stack gap="xs">
              {blocks.map((block) => {
                const times = instantsToPlanTimes(block.startAt, block.endAt);
                return (
                  <UnstyledButton
                    key={block._id}
                    onClick={() => {
                      setFormValues(blockFormValues(block));
                      setFormOpened(true);
                    }}
                  >
                    <Card padding="sm" withBorder>
                      <Group justify="space-between">
                        <Stack gap={2}>
                          <Text fw={600}>{block.title}</Text>
                          <Text c="dimmed" size="sm">
                            {times === null
                              ? `${block.startAt.slice(11, 16)}–${block.endAt.slice(11, 16)}`
                              : `${times.startTime}–${times.endTime}`}
                          </Text>
                        </Stack>
                        <Text size="sm">{PLAN_PRIORITY_STYLE[block.priority].label}</Text>
                      </Group>
                    </Card>
                  </UnstyledButton>
                );
              })}
            </Stack>
          )}
          <BoardScheduleEventForm
            frozen={editing?.frozen === true}
            initialValues={formValues}
            items={items}
            onClose={() => setFormOpened(false)}
            onDelete={
              editingId === undefined
                ? undefined
                : async () => {
                    const result = await actions.onRemoveBlock({ eventId: editingId });
                    if (Result.isOk(result)) setFormOpened(false);
                    return result;
                  }
            }
            onSubmit={async (values) => {
              if (values.eventId === undefined && formValues?.eventId === undefined) {
                return await actions.onCreateBlock(values);
              }
              return await actions.onUpdateBlock({
                ...values,
                eventId: values.eventId ?? formValues?.eventId,
              });
            }}
            opened={formOpened}
          />
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
