import { Field, Form, useForm } from "@formisch/react";
import { Button, Grid, Group, NumberInput, Stack, Text, Title } from "@mantine/core";
import { DEFAULT_PACE, PACE_LIMITS } from "~domain/domain";
import type { DateJst } from "~domain/jst";

import { LabelAlignedCell } from "~/components/label-aligned-cell";
import { WeeklyProgressCard } from "~/components/weekly-progress-card";
import { MissedWeekBanner } from "~/features/goals/components/missed-week-banner";
import { StreakBadge } from "~/features/goals/components/streak-badge";
import { WeeklyTrendChart } from "~/features/goals/components/weekly-trend-chart";
import { WeeklyTrendList } from "~/features/goals/components/weekly-trend-list";
import { currentStreak } from "~/features/goals/lib/weekly-trend-streak";
import { WeeklySchema } from "~/features/goals/schemas/weekly-schema";
import type { WeeklyTrendWeeks } from "~/features/goals/types/goal";
import type { SaveWeeklyInput } from "~/features/goals/types/mutations";
import type { WeekPage } from "~/features/history/types/history";
import type { MinutesByDate } from "~/lib/weekly-progress";

type WeeklyGoalPanelProps = {
  hasObstacles: boolean;
  minutesByDate: MinutesByDate;
  onSaveWeekly: (input: SaveWeeklyInput) => void;
  onShowObstacles: () => void;
  todayJst: DateJst;
  trendWeeks: WeeklyTrendWeeks;
  weekEndJst: WeekPage["weekEnd"];
  weeklyGoal: WeekPage["weeklyGoal"];
};

export function WeeklyGoalPanel({
  hasObstacles,
  minutesByDate,
  onSaveWeekly,
  onShowObstacles,
  todayJst,
  trendWeeks,
  weekEndJst,
  weeklyGoal,
}: WeeklyGoalPanelProps) {
  //? trendWeeks は新しい順。先頭 = 直近の完了週
  const lastWeek = trendWeeks[0];
  const showMissedBanner =
    lastWeek !== undefined && lastWeek.goalDays !== null && !lastWeek.achieved;
  const streak = currentStreak(trendWeeks);

  return (
    <Stack gap="md">
      <Title order={2}>週間ゴール</Title>
      <WeeklyProgressCard
        minutesByDate={minutesByDate}
        todayJst={todayJst}
        weekEndJst={weekEndJst}
        weeklyGoal={weeklyGoal}
      />
      <WeeklyGoalForm onSaveWeekly={onSaveWeekly} weeklyGoal={weeklyGoal} />
      {showMissedBanner && (
        <MissedWeekBanner
          hasObstacles={hasObstacles}
          lastWeek={lastWeek}
          onShowObstacles={onShowObstacles}
        />
      )}
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap">
          <Title order={3}>達成履歴</Title>
          <StreakBadge streak={streak} />
        </Group>
        <WeeklyTrendList weeks={trendWeeks} />
        <WeeklyTrendChart weeks={trendWeeks} />
      </Stack>
    </Stack>
  );
}

type WeeklyGoalFormProps = {
  onSaveWeekly: (input: SaveWeeklyInput) => void;
  weeklyGoal: WeekPage["weeklyGoal"];
};

//? ペース目標は動かさず、この週のスナップショットだけを書き換える
function WeeklyGoalForm({ onSaveWeekly, weeklyGoal }: WeeklyGoalFormProps) {
  const form = useForm({
    initialInput: {
      dailyFloorMinutes: weeklyGoal?.dailyFloorMinutes ?? DEFAULT_PACE.dailyFloorMinutes,
      days: weeklyGoal?.days ?? DEFAULT_PACE.daysPerWeek,
    },
    schema: WeeklySchema,
  });

  return (
    <Form of={form} onSubmit={onSaveWeekly}>
      <Stack gap="xs">
        <Text c="dimmed" size="sm">
          今週だけ調整できます。翌週はペース目標の値に戻ります。
        </Text>
        <Grid align="flex-start" gap="sm">
          <Grid.Col span={{ base: 6, sm: 4 }}>
            <Field of={form} path={["days"]}>
              {(field) => (
                <NumberInput
                  {...field.props}
                  error={field.errors?.[0]}
                  label="今週の実施日数"
                  max={PACE_LIMITS.maxDays}
                  min={PACE_LIMITS.minDays}
                  onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                  suffix=" 日"
                  value={field.input ?? ""}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 4 }}>
            <Field of={form} path={["dailyFloorMinutes"]}>
              {(field) => (
                <NumberInput
                  {...field.props}
                  error={field.errors?.[0]}
                  label="1日あたり最低分数"
                  min={PACE_LIMITS.minFloorMinutes}
                  onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
                  suffix=" 分"
                  value={field.input ?? ""}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <LabelAlignedCell>
              <Button fullWidth type="submit">
                週間ゴールを保存
              </Button>
            </LabelAlignedCell>
          </Grid.Col>
        </Grid>
      </Stack>
    </Form>
  );
}
