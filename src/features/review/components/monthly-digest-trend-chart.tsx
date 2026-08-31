import { BarChart } from "@mantine/charts";
import { Card, EmptyState, Stack, Text, Title } from "@mantine/core";
import { IconChartHistogram } from "@tabler/icons-react";

import {
  bucketRangeLabel,
  monthlyDigestBucketLabel,
} from "~/features/review/lib/monthly-review-labels";
import type { MonthlyReview } from "~/features/review/types/monthly-review";

const DIGEST_SERIES = [{ color: "orange.5", name: "消化率" }] as const;
const TITLE_ID = "monthly-digest-trend";

type MonthlyDigestTrendChartProps = Pick<MonthlyReview, "digestTrend">;

export function MonthlyDigestTrendChart({ digestTrend }: MonthlyDigestTrendChartProps) {
  const countedBuckets = digestTrend.filter((bucket) => bucket.plannedCount > 0);
  const partialBuckets = countedBuckets.filter((bucket) => bucket.isPartial);

  return (
    <Stack gap="xs">
      <Title id={TITLE_ID} order={3}>
        月間の消化推移
      </Title>
      {countedBuckets.length === 0 ? (
        <EmptyState
          description="記録を並べた週ができると、週ごとの消化率がここに出ます。"
          icon={<IconChartHistogram aria-hidden />}
          title="この月に数えられる週がありません"
        />
      ) : (
        <Card aria-labelledby={TITLE_ID} padding="md">
          <BarChart
            data={digestTrend.map((bucket, index) => ({
              label: monthlyDigestBucketLabel(index, bucket.isPartial),
              消化率: bucket.plannedCount === 0 ? null : Math.round(bucket.digestRate * 100),
            }))}
            dataKey="label"
            gridAxis="y"
            h={220}
            maxBarWidth={36}
            series={[...DIGEST_SERIES]}
            tickLine="y"
            valueFormatter={(value) => `${value}%`}
            withBarValueLabel
            withLegend={false}
            yAxisProps={{ domain: [0, 100] }}
          />
        </Card>
      )}
      <Text c="var(--cairn-muted-2)" size="xs">
        確定 ÷ 並んだ件数。今日の行は数えません。
        {partialBuckets.length === 0
          ? null
          : `（一部）は暦週の一部だけを数えた週です: ${partialBuckets
              .map((bucket) => bucketRangeLabel(bucket.bucketStart, bucket.bucketEnd))
              .join("、")}`}
      </Text>
    </Stack>
  );
}
