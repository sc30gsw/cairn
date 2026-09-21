import { Button, Collapse, ColorSwatch, DataList, Group, Text, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconCalendarEvent, IconTemplate } from "@tabler/icons-react";
import { PLAN_PRIORITY_STYLE } from "~domain/planEvent";

import type { PlanDayScheduleEntry } from "~/features/plan/lib/plan-event-display-name";

import classes from "~/features/plan/components/plan-day-schedule-list.module.css";

type PlanDayScheduleHeaderButtonProps = {
  onToggle: () => void;
  opened: boolean;
};

export function PlanDayScheduleHeaderButton({
  onToggle,
  opened,
}: PlanDayScheduleHeaderButtonProps) {
  const isCompact = useMediaQuery("(max-width: 47.9375em)", false, {
    getInitialValueInEffect: true,
  });

  return (
    <Tooltip label="この日の予定">
      <Button
        aria-expanded={opened}
        aria-label="この日の予定"
        onClick={onToggle}
        variant={opened ? "filled" : "light"}
      >
        <IconCalendarEvent aria-hidden size={16} stroke={1.5} />
        {isCompact ? null : <span>この日の予定</span>}
      </Button>
    </Tooltip>
  );
}

export function PlanTemplateAddButton({ onClick }: { onClick: () => void }) {
  const isCompact = useMediaQuery("(max-width: 47.9375em)", false, {
    getInitialValueInEffect: true,
  });

  return (
    <Tooltip label="計画プリセットを追加">
      <Button onClick={onClick} variant="light">
        <IconTemplate aria-hidden size={16} stroke={1.5} />
        {isCompact ? null : <span>計画プリセットを追加</span>}
      </Button>
    </Tooltip>
  );
}

function ScheduleEntryRow({ entry }: { entry: PlanDayScheduleEntry }) {
  const priorityColor =
    entry.priority === undefined ? undefined : PLAN_PRIORITY_STYLE[entry.priority].hex;

  return (
    <DataList.Item
      className={entry.draft === true ? classes.draftRow : undefined}
      data-external={entry.external === true ? "true" : undefined}
    >
      <DataList.ItemLabel>
        {entry.startTime}–{entry.endTime}
      </DataList.ItemLabel>
      <DataList.ItemValue>
        <Group gap="xs" wrap="nowrap">
          {priorityColor === undefined ? null : <ColorSwatch color={priorityColor} size={12} />}
          <Text c={entry.external === true ? "dimmed" : undefined} size="sm">
            {entry.name}
          </Text>
        </Group>
      </DataList.ItemValue>
    </DataList.Item>
  );
}

type PlanDayScheduleCollapsePanelProps = {
  entries: readonly PlanDayScheduleEntry[];
  opened: boolean;
};

export function PlanDayScheduleCollapsePanel({
  entries,
  opened,
}: PlanDayScheduleCollapsePanelProps) {
  return (
    <Collapse expanded={opened} keepMounted={false}>
      {entries.length === 0 ? (
        <Text c="dimmed" size="sm">
          この日の予定はまだありません。
        </Text>
      ) : (
        <DataList withDivider>
          {entries.map((entry) => (
            <ScheduleEntryRow entry={entry} key={entry.key} />
          ))}
        </DataList>
      )}
    </Collapse>
  );
}
