import { Anchor, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import type { weeklyReviewRef } from "~domain/reviewRefs";

import { NUMERAL_FONT } from "~/lib/theme";

//? 週次・月次で digest の形は同じ(convex/lib/validators.ts の ReviewDto 系)。週次の型から借りる
type PeriodDigest = FunctionReturnType<typeof weeklyReviewRef>["digest"];

type PeriodSummarySectionProps = {
  activeDays: number;
  confirmedMinutes: number;
  digest: PeriodDigest;
  reviewTab: "monthly" | "weekly";
  title: string;
};

function PeriodStat({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Text c="var(--cairn-muted-2)" size="sm">
        {label}
      </Text>
      <Text ff={NUMERAL_FONT} fw={600} fz={28} lh={1.1}>
        {value}
      </Text>
    </Stack>
  );
}

//* 状況ページの週・月サマリー。詳しい内訳はレビューに任せ、ここは3つの数字だけを出す。
export function PeriodSummarySection({
  activeDays,
  confirmedMinutes,
  digest,
  reviewTab,
  title,
}: PeriodSummarySectionProps) {
  const hasDigest = digest.plannedCount > 0;

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>{title}</Title>
        <Group gap="xl">
          <PeriodStat label="学習量" value={`${confirmedMinutes}分`} />
          <PeriodStat label="実施日" value={`${activeDays}日`} />
          <PeriodStat
            label="消化"
            value={hasDigest ? `${Math.round(digest.digestRate * 100)}%` : "—"}
          />
        </Group>
        <Anchor
          renderRoot={(props) => <Link {...props} search={{ tab: reviewTab }} to="/review" />}
          size="sm"
        >
          {reviewTab === "weekly" ? "週次レビューで詳しく見る" : "月次レビューで詳しく見る"}
        </Anchor>
      </Stack>
    </Card>
  );
}
