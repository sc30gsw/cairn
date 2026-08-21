import { Alert, Anchor, Button, Progress, Stack, Table, Text, Title } from "@mantine/core";

import {
  presetReviewCaption,
  suggestionCopy,
  suggestionLinkLabel,
  weekdayLabel,
  weeklyTargetCopy,
} from "~/features/history/lib/preset-review-copy";
import type { PresetReview } from "~/features/history/types/history";

type PresetReviewPanelProps = {
  review: PresetReview;
};

function digestPercent(confirmed: number, planned: number): number {
  if (planned === 0) {
    return 0;
  }
  return Math.round((confirmed / planned) * 100);
}

export function PresetReviewPanel({ review }: PresetReviewPanelProps) {
  const plannedAny = review.weekdays.some((row) => row.planned > 0);
  const weeklyTargets = review.weeklyTargets;

  return (
    <Stack gap="md">
      <div>
        <Title id="preset-review-heading" order={3}>
          曜日の計画
        </Title>
        <Text c="dimmed" size="sm">
          {presetReviewCaption(review.windowStart, review.windowEnd)}
        </Text>
      </div>

      {weeklyTargets.total > 0 ? (
        <Text size="sm">
          {weeklyTargetCopy(weeklyTargets.achieved, weeklyTargets.total)}
          {" · "}
          <Anchor href="/goals" size="sm">
            週間ターゲットを見る
          </Anchor>
        </Text>
      ) : null}

      {plannedAny ? (
        <Table
          aria-labelledby="preset-review-heading"
          captionSide="top"
          highlightOnHover
          striped
          withTableBorder
        >
          <Table.Caption className="text-left lg:text-center">
            消化は確定件数 / 並んだ件数。項目別のノルマではない。
          </Table.Caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">曜日</Table.Th>
              <Table.Th scope="col">確定</Table.Th>
              <Table.Th scope="col">見送り</Table.Th>
              <Table.Th scope="col">未着手</Table.Th>
              <Table.Th scope="col">消化</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {review.weekdays.map((row) => {
              const percent = digestPercent(row.confirmed, row.planned);
              return (
                <Table.Tr key={row.weekday}>
                  <Table.Td>{weekdayLabel(row.weekday)}</Table.Td>
                  <Table.Td>{row.confirmed}</Table.Td>
                  <Table.Td>{row.skipped}</Table.Td>
                  <Table.Td>{row.leftover}</Table.Td>
                  <Table.Td>
                    {row.planned === 0 ? (
                      "—"
                    ) : (
                      <Stack gap={4}>
                        <Text size="sm">
                          {row.confirmed}/{row.planned}
                        </Text>
                        <Progress
                          aria-label={`${weekdayLabel(row.weekday)}の消化 ${row.confirmed}/${row.planned}`}
                          size="sm"
                          value={percent}
                        />
                      </Stack>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      ) : (
        <Alert color="blue" title="記録なし">
          この期間に日がある記録がありません。休養の曜日はここには出ません。
        </Alert>
      )}

      {review.suggestions.map((suggestion) => {
        const weekday = review.weekdays.find((row) => row.weekday === suggestion.weekday);
        return (
          <Alert
            color="yellow"
            key={suggestion.weekday}
            title={weekdayLabel(suggestion.weekday)}
            variant="light"
          >
            <Stack gap="sm">
              <Text size="sm">{suggestionCopy(suggestion, weekday)}</Text>
              <Button
                color="yellow"
                component="a"
                href={`/presets?weekday=${suggestion.weekday}`}
                size="xs"
                variant="light"
              >
                {suggestionLinkLabel(suggestion.weekday)}
              </Button>
            </Stack>
          </Alert>
        );
      })}
    </Stack>
  );
}
