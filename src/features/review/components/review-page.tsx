import { Tabs, Text } from "@mantine/core";
import { Suspense } from "react";

import { PageTitle } from "~/components/page-title";
import { ReviewPending } from "~/features/review/components/review-pending";
import { WeeklyReviewTab } from "~/features/review/components/weekly-review-tab";
import { WeeklyReviewTabPending } from "~/features/review/components/weekly-review-tab-pending";
import { useReviewView } from "~/features/review/hooks/use-review-view";
import type { ReviewTab } from "~/features/review/schemas/review-search-schema";

import tabBarClasses from "~/components/pills-tab-bar.module.css";

export function ReviewPage() {
  return (
    <Suspense fallback={<ReviewPending />}>
      <ReviewReady />
    </Suspense>
  );
}

//? 月次タブの中身は別チケット。ReviewPage は月次側の実装を直接 import しない構造にしておく
function MonthlyReviewPlaceholder() {
  return <Text c="dimmed">月次レビューは準備中です。</Text>;
}

function ReviewReady() {
  const { setTab, tab } = useReviewView();

  return (
    <>
      <PageTitle mb="md">レビュー</PageTitle>
      <Tabs
        onChange={(value) => {
          if (value === "weekly" || value === "monthly") {
            setTab(value);
          }
        }}
        value={tab}
        variant="pills"
      >
        <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
          <Tabs.Tab value={"weekly" satisfies ReviewTab}>週次</Tabs.Tab>
          <Tabs.Tab value={"monthly" satisfies ReviewTab}>月次</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel pt="md" value="weekly">
          {tab === "weekly" ? (
            <Suspense fallback={<WeeklyReviewTabPending />}>
              <WeeklyReviewTab />
            </Suspense>
          ) : null}
        </Tabs.Panel>

        <Tabs.Panel pt="md" value="monthly">
          {tab === "monthly" ? <MonthlyReviewPlaceholder /> : null}
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
