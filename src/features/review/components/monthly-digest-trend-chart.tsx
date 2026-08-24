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

//* 月の中で尻すぼみか尻上がりかを見るための1枚。曜日別の消化(履歴)とは役割が違う。
//? 週次レビューは表で足りたが、週バケット4〜6本のトレンドは既存のどこにも無い絵なので
//? この画面だけ @mantine/charts を使う。数値は棒の上のラベルにも出し、絵だけで伝えない。
export function MonthlyDigestTrendChart({ digestTrend }: MonthlyDigestTrendChartProps) {
  const countedBuckets = digestTrend.filter((bucket) => bucket.plannedCount > 0);
  //? 棒が描かれない週に注記を付けても読み手は照らし合わせられないので、数えた週だけを挙げる
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
              //? 記録が1件も並んでいない週は棒を描かない。0% と描くと「サボった」に見えてしまい、
              //? 消化(計画が残ったかの指標)の定義に反する
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
            //? 月をまたいでも軸のスケールが変わらないように 0〜100% 固定
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
