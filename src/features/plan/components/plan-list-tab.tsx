import { Button, Card, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { Result } from "better-result";
import { useState } from "react";
import { PLAN_PRIORITY_STYLE } from "~domain/planEvent";

import {
  BoardScheduleEventForm,
  eventFormValues,
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
import type { PlanScheduleEventInput } from "~/features/plan/schemas/board-schedule-event-schema";
import { useItemsList } from "~/hooks/use-items-list";
import { parseDateJst } from "~/lib/schemas/calendar-date-schema";

export function PlanListTab() {
  const view = usePlanView();
  const { events, unplannedConfirmedMinutes } = usePlanWindow(view.selectedDateJst, "day");
  const { data: items } = useItemsList();
  const actions = useBoardScheduleActions();
  const [formOpened, setFormOpened] = useState(false);
  const [formValues, setFormValues] = useState<PlanScheduleEventInput | null>(null);
  const [calendar, setCalendar] = useState({
    forSelected: view.selectedDateJst,
    month: view.selectedDateJst,
  });
  const month =
    calendar.forSelected === view.selectedDateJst ? calendar.month : view.selectedDateJst;
  const editingId = formValues?.eventId;
  const editing =
    editingId === undefined ? undefined : events.find((event) => event._id === editingId);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <Stack className="w-full shrink-0 lg:max-w-80" gap="md">
        <DatePicker
          allowDeselect={false}
          aria-label="日付を選択"
          date={month}
          onChange={(value) => {
            const next = parseDateJst(value);
            if (next !== undefined) {
              view.setDate(next);
            }
          }}
          onDateChange={(value) => {
            const next = parseDateJst(value);
            if (next !== undefined) {
              setCalendar({ forSelected: view.selectedDateJst, month: next });
            }
          }}
          value={view.selectedDateJst}
        />
        <Button
          onClick={() => {
            view.setDate(view.today);
            setCalendar({ forSelected: view.today, month: view.today });
          }}
          variant="light"
        >
          今日
        </Button>
        <PlanClock
          events={events}
          selectedDateJst={view.selectedDateJst}
          todayJst={view.today}
          unplannedConfirmedMinutes={unplannedConfirmedMinutes}
        />
      </Stack>
      <Stack className="min-w-0 flex-1" gap="md">
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
        {events.length === 0 ? (
          <Text c="dimmed" size="sm">
            この日の予定はまだありません。
          </Text>
        ) : (
          <Stack gap="xs">
            {events.map((event) => (
              <UnstyledButton
                key={event._id}
                onClick={() => {
                  setFormValues(eventFormValues(event));
                  setFormOpened(true);
                }}
              >
                <Card padding="sm" withBorder>
                  <Group justify="space-between">
                    <Stack gap={2}>
                      <Text fw={600}>{event.title}</Text>
                      <Text c="dimmed" size="sm">
                        {event.startTime}–{event.endTime}
                      </Text>
                    </Stack>
                    <Text size="sm">{PLAN_PRIORITY_STYLE[event.priority].label}</Text>
                  </Group>
                </Card>
              </UnstyledButton>
            ))}
          </Stack>
        )}
        <BoardScheduleEventForm
          frozen={editing?.recordState.kind === "materialized"}
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
            const eventId = values.eventId ?? formValues?.eventId;
            if (eventId === undefined) {
              return await actions.onCreateBlock(values);
            }
            return await actions.onUpdateBlock({ ...values, eventId });
          }}
          opened={formOpened}
        />
      </Stack>
    </div>
  );
}
