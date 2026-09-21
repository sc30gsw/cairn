import { ColorSwatch, Group, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { PLAN_PRIORITY_STYLE } from "~domain/planEvent";

import {
  clockArcPath,
  eventArcMinutes,
  jstMinuteOfDay,
  minuteToAngle,
  paintsClockArc,
} from "~/features/plan/lib/plan-clock-geometry";
import { PLAN_PRIORITY_OPTIONS } from "~/features/plan/lib/plan-priority-style";
import type { PlanEventDto } from "~/features/plan/types/plan";

import classes from "~/features/plan/components/plan-clock.module.css";

const CLOCK_CX = 120;
const CLOCK_CY = 120;
const CLOCK_RADIUS = 92;
const NEEDLE_RADIUS = 78;
const TICK_MINUTES = [0, 360, 720, 1080] as const satisfies readonly number[];

type PlanClockProps = {
  events: readonly PlanEventDto[];
  now?: Date;
  selectedDateJst: string;
  todayJst: string;
  unplannedConfirmedMinutes: number;
};

function needlePoint(minute: number, radius: number): { x: number; y: number } {
  const angle = (minuteToAngle(minute) * Math.PI) / 180;
  return {
    x: CLOCK_CX + radius * Math.cos(angle),
    y: CLOCK_CY + radius * Math.sin(angle),
  };
}

function hourLabel(minute: number): string {
  return String(minute / 60);
}

export function PlanClock({
  events,
  now,
  selectedDateJst,
  todayJst,
  unplannedConfirmedMinutes,
}: PlanClockProps) {
  const [tickingNow, setTickingNow] = useState(() => new Date());
  const isToday = selectedDateJst === todayJst;

  useEffect(() => {
    if (now !== undefined) {
      return;
    }
    const timer = window.setInterval(() => {
      setTickingNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [now]);

  const liveNow = now ?? tickingNow;

  const painted = events.filter(paintsClockArc);
  const needleMinute = jstMinuteOfDay(liveNow);
  const tip = needlePoint(needleMinute, NEEDLE_RADIUS);

  return (
    <Stack className={classes.clock} gap="sm">
      <svg aria-label="一日の時計" className={classes.face} viewBox="0 0 240 240">
        <circle
          cx={CLOCK_CX}
          cy={CLOCK_CY}
          fill="var(--mantine-color-body)"
          r={CLOCK_RADIUS + 8}
          stroke="var(--mantine-color-default-border)"
          strokeWidth="2"
        />
        {TICK_MINUTES.map((minute) => {
          const outer = needlePoint(minute, CLOCK_RADIUS + 2);
          const inner = needlePoint(minute, CLOCK_RADIUS - 10);
          const label = needlePoint(minute, CLOCK_RADIUS - 24);
          return (
            <g key={minute}>
              <line
                stroke="var(--mantine-color-dimmed)"
                strokeWidth="2"
                x1={inner.x}
                x2={outer.x}
                y1={inner.y}
                y2={outer.y}
              />
              <text
                fill="var(--mantine-color-dimmed)"
                fontSize="12"
                textAnchor="middle"
                x={label.x}
                y={label.y + 4}
              >
                {hourLabel(minute)}
              </text>
            </g>
          );
        })}
        {painted.map((event) => {
          const { endMinute, startMinute } = eventArcMinutes(event);
          return (
            <path
              d={clockArcPath(CLOCK_CX, CLOCK_CY, CLOCK_RADIUS, startMinute, endMinute)}
              fill="none"
              key={event._id}
              stroke={PLAN_PRIORITY_STYLE[event.priority].hex}
              strokeLinecap="round"
              strokeWidth="10"
            />
          );
        })}
        {isToday ? (
          <g>
            <line
              stroke="var(--mantine-color-text)"
              strokeWidth="2"
              x1={CLOCK_CX}
              x2={tip.x}
              y1={CLOCK_CY}
              y2={tip.y}
            />
            <circle cx={CLOCK_CX} cy={CLOCK_CY} fill="var(--mantine-color-text)" r="4" />
          </g>
        ) : null}
      </svg>
      <Group gap="md" justify="center">
        {PLAN_PRIORITY_OPTIONS.map((option) => (
          <Group gap="xs" key={option.value} wrap="nowrap">
            <ColorSwatch color={option.hex} size={14} />
            <Text size="sm">{option.label}</Text>
          </Group>
        ))}
      </Group>
      <Text c="dimmed" className={classes.unplanned} size="sm">
        予定に載らない確定 {unplannedConfirmedMinutes}分
      </Text>
    </Stack>
  );
}
