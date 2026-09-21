import { ColorSwatch, Group, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import type { DateJst } from "~domain/jst";
import { PLAN_PRIORITY_STYLE } from "~domain/planEvent";

import {
  clockPiePath,
  clockPoint,
  eventArcMinutes,
  jstMinuteOfDay,
  paintsClockArc,
} from "~/features/plan/lib/plan-clock-geometry";
import { PLAN_PRIORITY_OPTIONS } from "~/features/plan/lib/plan-priority-style";
import type { PlanEventDto } from "~/features/plan/types/plan";

import classes from "~/features/plan/components/plan-clock.module.css";

export const PLAN_CLOCK_HEADING = "何に時間を使ったか";

const CLOCK_CX = 120;
const CLOCK_CY = 120;
const FACE_RADIUS = 96;
const PIE_RADIUS = 80;
const TICK_INNER = 84;
const TICK_OUTER_MINOR = 92;
const TICK_OUTER_MAJOR = 96;
const NUMERAL_RADIUS = 106;
const NEEDLE_RADIUS = 88;
const HOUR_TICK_MINUTES = Array.from({ length: 24 }, (_, hour) => hour * 60);
const NUMERAL_MINUTES = new Set([0, 360, 720, 1080]);

type PlanClockProps = {
  events: readonly PlanEventDto[];
  now?: Date;
  selectedDateJst: DateJst;
  todayJst: DateJst;
  unplannedConfirmedMinutes: number;
};

function needlePoint(minute: number, radius: number): { x: number; y: number } {
  return clockPoint(CLOCK_CX, CLOCK_CY, radius, minute);
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
      <svg aria-hidden="true" className={classes.face} viewBox="0 0 240 240">
        <circle
          cx={CLOCK_CX}
          cy={CLOCK_CY}
          fill="var(--mantine-color-body)"
          r={FACE_RADIUS}
          stroke="var(--mantine-color-default-border)"
          strokeWidth="2"
        />
        {painted.map((event) => {
          const { endMinute, startMinute } = eventArcMinutes(event);
          return (
            <path
              className={classes.sector}
              d={clockPiePath(CLOCK_CX, CLOCK_CY, PIE_RADIUS, startMinute, endMinute)}
              fill={PLAN_PRIORITY_STYLE[event.priority].hex}
              key={event._id}
            />
          );
        })}
        {HOUR_TICK_MINUTES.map((minute) => {
          const isNumeral = NUMERAL_MINUTES.has(minute);
          const outer = needlePoint(minute, isNumeral ? TICK_OUTER_MAJOR : TICK_OUTER_MINOR);
          const inner = needlePoint(minute, TICK_INNER);
          const label = needlePoint(minute, NUMERAL_RADIUS);
          return (
            <g key={minute}>
              <line
                stroke="var(--mantine-color-dimmed)"
                strokeWidth={isNumeral ? 2 : 1}
                x1={inner.x}
                x2={outer.x}
                y1={inner.y}
                y2={outer.y}
              />
              {isNumeral ? (
                <text
                  fill="var(--mantine-color-dimmed)"
                  fontSize="12"
                  textAnchor="middle"
                  x={label.x}
                  y={label.y + 4}
                >
                  {hourLabel(minute)}
                </text>
              ) : null}
            </g>
          );
        })}
        {isToday ? (
          <g>
            <line
              className={classes.needle}
              strokeWidth="2.5"
              x1={CLOCK_CX}
              x2={tip.x}
              y1={CLOCK_CY}
              y2={tip.y}
            />
            <circle className={classes.hub} cx={CLOCK_CX} cy={CLOCK_CY} r="4.5" />
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
