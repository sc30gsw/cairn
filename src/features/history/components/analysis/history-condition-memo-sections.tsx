import { Stack, Text, Title } from "@mantine/core";
import type { DateJst } from "~domain/jst";

import { ConditionAvgMinutes } from "~/features/history/components/analysis/condition-avg-minutes";
import { DayMemoHighlight } from "~/features/history/components/analysis/day-memo-highlight";
import { MemosByCondition } from "~/features/history/components/analysis/memos-by-condition";
import type { AnalysisScope } from "~/features/history/schemas/analysis-scope-schema";
import type { HeatmapDay } from "~/features/history/types/history";

type HistoryConditionMemoSectionsProps = {
  scope: AnalysisScope;
  scopeDays: readonly HeatmapDay[];
  selectedDateJst: DateJst;
};

export function HistoryConditionMemoSections({
  scope,
  scopeDays,
  selectedDateJst,
}: HistoryConditionMemoSectionsProps) {
  return (
    <>
      {scope === "day" ? (
        <Stack gap="xs">
          <Title order={4}>この日のメモ</Title>
          <DayMemoHighlight day={scopeDays[0]} selectedDateJst={selectedDateJst} />
        </Stack>
      ) : null}

      <Stack gap="xs">
        <Title order={4}>コンディション別の平均学習量</Title>
        <ConditionAvgMinutes days={scopeDays} />
      </Stack>

      {scope === "week" || scope === "month" ? (
        <Stack gap="xs">
          <Title order={4}>メモ（コンディション別）</Title>
          <Text c="dimmed" size="sm">
            メモがある日をコンディションごとに並べます。新しい日が上に来ます。
          </Text>
          <MemosByCondition days={scopeDays} />
        </Stack>
      ) : null}
    </>
  );
}
