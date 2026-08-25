import { convexQuery } from "@convex-dev/react-query";
import { ActionIcon, Anchor, Group, Indicator, Text, Tooltip } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";
import { IconPlayerPauseFilled } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { measuredMs, timerMinutes } from "~domain/rowTimer";

import { api } from "~/../convex/_generated/api";
import { useStopRunningTimer } from "~/hooks/use-row-mutations";
import { useTimerTick } from "~/hooks/use-timer-tick";
import { useTodayJst } from "~/hooks/use-today-jst";
import { boardKanbanLink } from "~/lib/board-day-links";
import { runMutation } from "~/lib/run-mutation";
import { recordServerInstant } from "~/lib/server-clock";
import { NUMERAL_FONT } from "~/lib/theme";
import { formatTimerClock } from "~/lib/timer-clock";

//* ボードから離れても計測中が見えていること。放置対策として最も効く手当て(study-timer.md §13.2)。
//? 置ける操作は ⏸ と「ボードへ」だけ。確定は項目名と分数を見ながらボードで行う。
export function RunningTimerIndicator() {
  const { data: running } = useSuspenseQuery(
    convexQuery(api.queries.rows.runningTimer.runningTimer, {}),
  );
  const stopTimer = useStopRunningTimer();
  const startedAt = running?.timer.startedAt ?? null;
  const nowMs = useTimerTick(startedAt !== null);
  const today = useTodayJst();

  useEffect(() => {
    if (startedAt !== null) {
      recordServerInstant(startedAt, Date.now());
    }
  }, [startedAt]);

  if (running === null || startedAt === null) {
    return null;
  }

  const elapsedMs = measuredMs(running.timer, nowMs);

  return (
    <Group gap="xs" wrap="nowrap">
      <Indicator color="orange" processing size={8}>
        <span />
      </Indicator>
      <Text aria-hidden ff={NUMERAL_FONT} fw={700} size="sm">
        {formatTimerClock(elapsedMs)}
      </Text>
      <Text className="sr-only" component="output" size="xs">
        {`${running.itemName} を計測中 ${String(timerMinutes(elapsedMs))}分`}
      </Text>
      <Anchor
        c="var(--cairn-muted-2)"
        renderRoot={(props) => <Link {...props} {...boardKanbanLink(running.dateJst, today)} />}
        size="xs"
        underline="hover"
      >
        {running.itemName}
      </Anchor>
      <Tooltip label="計測を止める" withArrow>
        <ActionIcon
          aria-label="計測を止める"
          color="orange"
          onClick={() => {
            void runMutation(() => stopTimer.mutateAsync({ rowId: running._id }), {
              successMessage: "計測を止めました",
            });
          }}
          size="sm"
          variant="light"
        >
          <IconPlayerPauseFilled aria-hidden size={12} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

//* Suspense の fallback。計測中の構造だけを真似た静的モック(suspend する本体を入れない)。
export function RunningTimerIndicatorFallback() {
  return (
    <Shimmer loading>
      <Group gap="xs" wrap="nowrap">
        <Text ff={NUMERAL_FONT} fw={700} size="sm">
          00:00
        </Text>
        <Text size="xs">項目名</Text>
      </Group>
    </Shimmer>
  );
}
