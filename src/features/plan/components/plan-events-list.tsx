import {
  Badge,
  Button,
  Card,
  ColorSwatch,
  Group,
  Modal,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconClock, IconFlag, IconListDetails } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import type { PlanPriority } from "~domain/planEvent";
import { PLAN_PRIORITY_STYLE } from "~domain/planEvent";

import { planEventDisplayName } from "~/features/plan/lib/plan-event-display-name";
import { PLAN_PRIORITY_OPTIONS } from "~/features/plan/lib/plan-priority-style";
import type { PlanCatalogItem, PlanEventDto } from "~/features/plan/types/plan";
import { RECORD_STATUS_UI, statusTooltip } from "~/lib/record-status-ui";
import { useOptionalPlanEventsLiveQuery } from "~/lib/tanstack-db/collections";
import { cn } from "~/lib/utils";

export const PLAN_EVENTS_LIST_LABEL = "予定一覧";
export const PLAN_EVENTS_LIST_OPEN_TOOLTIP = "この日の予定を開きます";
export const PLAN_EVENTS_LIST_CLOSE_TOOLTIP = "この日の予定を閉じます";
export const PLAN_EVENTS_SORT_TIME_LABEL = "時刻で並べる";
export const PLAN_EVENTS_SORT_TIME_TOOLTIP = "開始時刻で並べます";
export const PLAN_EVENTS_SORT_PRIORITY_LABEL = "優先度で並べる";
export const PLAN_EVENTS_SORT_PRIORITY_TOOLTIP = "優先度で並べます";
export const PLAN_EVENTS_FILTER_CLEAR_TOOLTIP = "この優先度の絞り込みを外します";
export const PLAN_EVENTS_EMPTY_COPY = "この日の予定はまだありません。";

const PRIORITY_FILTER_TOOLTIP = {
  high: "高だけ見せます",
  low: "低だけ見せます",
  medium: "中だけ見せます",
} as const satisfies Record<PlanPriority, string>;

type EventsSort = "priority" | "time";

type PlanEventsListProps = {
  dateJst: string;
  eventsFallback: readonly PlanEventDto[];
  headerEnd?: ReactNode;
  items: readonly PlanCatalogItem[];
  onSelectEvent: (event: PlanEventDto) => void;
};

export function PlanEventsList({
  dateJst,
  eventsFallback,
  headerEnd,
  items,
  onSelectEvent,
}: PlanEventsListProps) {
  const [opened, setOpened] = useState(false);
  const [sort, setSort] = useState<EventsSort>("time");
  const [priority, setPriority] = useState<PlanPriority | undefined>(undefined);
  const live = useOptionalPlanEventsLiveQuery({
    anchorDateJst: dateJst,
    priority,
    sort,
    view: "day",
  });
  const events = live.isReady && live.data !== undefined ? live.data : eventsFallback;
  const toggleTooltip = opened ? PLAN_EVENTS_LIST_CLOSE_TOOLTIP : PLAN_EVENTS_LIST_OPEN_TOOLTIP;

  return (
    <Stack gap="xs">
      <Group justify="flex-end" wrap="nowrap">
        <PlanEventsListToggle
          onToggle={() => setOpened((current) => !current)}
          opened={opened}
          tooltip={toggleTooltip}
        />
        {headerEnd}
      </Group>
      <Modal
        onClose={() => setOpened(false)}
        opened={opened}
        title={PLAN_EVENTS_LIST_LABEL}
        transitionProps={{ duration: 0 }}
      >
        <Stack gap="xs">
          <PlanEventsListToolbar
            onPriorityChange={setPriority}
            onSortChange={setSort}
            priority={priority}
            sort={sort}
          />
          {events.length === 0 ? (
            <Text c="dimmed" size="sm">
              {PLAN_EVENTS_EMPTY_COPY}
            </Text>
          ) : (
            events.map((event) => (
              <PlanEventListRow
                event={event}
                items={items}
                key={event._id}
                onSelect={() => {
                  setOpened(false);
                  onSelectEvent(event);
                }}
              />
            ))
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}

function PlanEventsListToggle({
  onToggle,
  opened,
  tooltip,
}: {
  onToggle: () => void;
  opened: boolean;
  tooltip: string;
}) {
  const isCompact = useMediaQuery("(max-width: 47.9375em)", false, {
    getInitialValueInEffect: true,
  });

  return (
    <Tooltip label={tooltip}>
      <Button
        aria-expanded={opened}
        aria-label={tooltip}
        onClick={onToggle}
        variant={opened ? "filled" : "light"}
      >
        <IconListDetails aria-hidden size={16} stroke={1.5} />
        {isCompact ? null : <span>{PLAN_EVENTS_LIST_LABEL}</span>}
      </Button>
    </Tooltip>
  );
}

function PlanEventsListToolbar({
  onPriorityChange,
  onSortChange,
  priority,
  sort,
}: {
  onPriorityChange: (priority: PlanPriority | undefined) => void;
  onSortChange: (sort: EventsSort) => void;
  priority: PlanPriority | undefined;
  sort: EventsSort;
}) {
  const isCompact = useMediaQuery("(max-width: 47.9375em)", false, {
    getInitialValueInEffect: true,
  });

  return (
    <Group gap="xs" wrap="wrap">
      <Tooltip label={PLAN_EVENTS_SORT_TIME_TOOLTIP}>
        <Button
          aria-label={PLAN_EVENTS_SORT_TIME_TOOLTIP}
          aria-pressed={sort === "time"}
          onClick={() => onSortChange("time")}
          size="compact-sm"
          variant={sort === "time" ? "filled" : "light"}
        >
          <IconClock aria-hidden size={16} stroke={1.5} />
          {isCompact ? null : <span>{PLAN_EVENTS_SORT_TIME_LABEL}</span>}
        </Button>
      </Tooltip>
      <Tooltip label={PLAN_EVENTS_SORT_PRIORITY_TOOLTIP}>
        <Button
          aria-label={PLAN_EVENTS_SORT_PRIORITY_TOOLTIP}
          aria-pressed={sort === "priority"}
          onClick={() => onSortChange("priority")}
          size="compact-sm"
          variant={sort === "priority" ? "filled" : "light"}
        >
          <IconFlag aria-hidden size={16} stroke={1.5} />
          {isCompact ? null : <span>{PLAN_EVENTS_SORT_PRIORITY_LABEL}</span>}
        </Button>
      </Tooltip>
      {PLAN_PRIORITY_OPTIONS.map((option) => {
        const selected = priority === option.value;
        const tooltip = selected
          ? PLAN_EVENTS_FILTER_CLEAR_TOOLTIP
          : PRIORITY_FILTER_TOOLTIP[option.value];
        return (
          <Tooltip key={option.value} label={tooltip}>
            <Button
              aria-label={tooltip}
              aria-pressed={selected}
              onClick={() => onPriorityChange(selected ? undefined : option.value)}
              size="compact-sm"
              variant={selected ? "filled" : "light"}
            >
              <Group gap={6} wrap="nowrap">
                <ColorSwatch color={option.hex} size={12} />
                <span>{option.label}</span>
              </Group>
            </Button>
          </Tooltip>
        );
      })}
    </Group>
  );
}

function PlanEventListRow({
  event,
  items,
  onSelect,
}: {
  event: PlanEventDto;
  items: readonly PlanCatalogItem[];
  onSelect: () => void;
}) {
  const name = planEventDisplayName(event.title, event.itemId, items);
  const materialized = event.recordState.kind === "materialized" ? event.recordState : null;
  const isConfirmed = materialized?.status === "確定";
  const badge =
    materialized === null
      ? null
      : materialized.status === "スキップ"
        ? { color: "red", label: RECORD_STATUS_UI.スキップ.label }
        : RECORD_STATUS_UI[materialized.status];

  return (
    <UnstyledButton onClick={onSelect}>
      <Card padding="sm" withBorder>
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={2}>
            <Text className={cn(isConfirmed && "line-through")} fw={600}>
              {name}
            </Text>
            <Text c="dimmed" className={cn(isConfirmed && "line-through")} size="sm">
              {event.startTime}–{event.endTime}
            </Text>
          </Stack>
          <Group gap="xs" wrap="nowrap">
            {badge === null || materialized === null ? null : (
              <Tooltip label={statusTooltip(materialized.status)}>
                <Badge color={badge.color} size="sm" variant="light">
                  {badge.label}
                </Badge>
              </Tooltip>
            )}
            <ColorSwatch color={PLAN_PRIORITY_STYLE[event.priority].hex} size={14} />
            <Text size="sm">{PLAN_PRIORITY_STYLE[event.priority].label}</Text>
          </Group>
        </Group>
      </Card>
    </UnstyledButton>
  );
}
