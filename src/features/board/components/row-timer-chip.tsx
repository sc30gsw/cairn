import { ActionIcon, Alert, Group, Indicator, Paper, Text, Tooltip } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { useEffect } from "react";
import { measuredMs, TIMER_AUTO_STOP_MINUTES, timerMinutes, timerRunState } from "~domain/rowTimer";

import type { BoardRow } from "~/features/board/types/board";
import { useTimerTick } from "~/hooks/use-timer-tick";
import { recordServerInstant } from "~/lib/server-clock";
import { NUMERAL_FONT } from "~/lib/theme";
import { formatTimerClock } from "~/lib/timer-clock";

import classes from "~/features/board/components/row-timer-chip.module.css";

type RowTimerChipProps = {
  disabled?: boolean;
  onConfirm: () => void;
  onResume: () => void;
  onStop: () => void;
  row: BoardRow;
};

export function RowTimerChip({
  disabled = false,
  onConfirm,
  onResume,
  onStop,
  row,
}: RowTimerChipProps) {
  const { timer } = row;
  const runState = timerRunState(timer);
  const running = runState === "計測中";
  const nowMs = useTimerTick(running);
  const startedAt = timer?.startedAt ?? null;

  useEffect(() => {
    if (startedAt !== null) {
      recordServerInstant(startedAt, Date.now());
    }
  }, [startedAt]);

  const elapsedMs = measuredMs(timer, nowMs);
  const minutes = timerMinutes(elapsedMs);
  const autoStopped = timer?.autoStoppedAt !== null && timer?.autoStoppedAt !== undefined;

  return (
    <Paper bg="var(--cairn-paper-2)" mt="xs" p="xs" radius="sm" withBorder>
      <Group gap="xs" justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          {running ? (
            <Indicator className={classes.indicator} color="orange" processing size={8}>
              <span />
            </Indicator>
          ) : null}
          {runState === "計測なし" ? (
            <Text c="var(--cairn-muted-2)" size="xs">
              計測をはじめる
            </Text>
          ) : (
            <Text aria-hidden ff={NUMERAL_FONT} fw={700} size="lg">
              {formatTimerClock(elapsedMs)}
            </Text>
          )}
          <Text className="sr-only" component="output" size="xs">
            {runState === "計測なし" ? "計測なし" : `${runState} ${String(minutes)}分`}
          </Text>
        </Group>
        <Group gap="xs" wrap="nowrap">
          {running ? (
            <Tooltip label="計測を止める" withArrow>
              <ActionIcon
                aria-label="計測を止める"
                color="orange"
                disabled={disabled}
                onClick={onStop}
                size="md"
                variant="light"
              >
                <IconPlayerPauseFilled aria-hidden size={14} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Tooltip label={runState === "計測なし" ? "計測をはじめる" : "計測を続ける"} withArrow>
              <ActionIcon
                aria-label={runState === "計測なし" ? "計測をはじめる" : "計測を続ける"}
                color="orange"
                disabled={disabled}
                onClick={onResume}
                size="md"
                variant="light"
              >
                <IconPlayerPlayFilled aria-hidden size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="確定する" withArrow>
            <ActionIcon
              aria-label="確定する"
              color="green"
              disabled={disabled}
              onClick={onConfirm}
              size="md"
              variant="filled"
            >
              <IconCheck aria-hidden size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      {autoStopped ? (
        <Alert
          color="yellow"
          icon={<IconAlertTriangle aria-hidden size={16} />}
          mt="xs"
          p="xs"
          variant="light"
        >
          {TIMER_AUTO_STOP_MINUTES}
          分で自動停止しました。実際の学習時間に直してから確定してください。
        </Alert>
      ) : null}
    </Paper>
  );
}
