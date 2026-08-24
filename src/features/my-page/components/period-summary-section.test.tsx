import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";

import { PeriodSummarySection } from "~/features/my-page/components/period-summary-section";
import { renderWithMantine } from "~/test-utils/render";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const digest = {
  confirmedCount: 3,
  countedFrom: "2026-08-17",
  countedThrough: "2026-08-23",
  digestRate: 0.75,
  isPartial: false,
  leftoverCount: 0,
  ongoingCount: 1,
  plannedCount: 4,
  skippedCount: 0,
};

test("週の状況は学習量・実施日・消化とレビューへのリンクを出す", () => {
  const { getByRole, getByText } = renderWithMantine(
    <PeriodSummarySection
      activeDays={5}
      confirmedMinutes={210}
      digest={digest}
      reviewTab="weekly"
      title="今週の状況"
    />,
  );

  expect(getByText("今週の状況")).toBeDefined();
  expect(getByText("210分")).toBeDefined();
  expect(getByText("5日")).toBeDefined();
  expect(getByText("75%")).toBeDefined();
  expect(getByRole("link", { name: "週次レビューで詳しく見る" }).getAttribute("href")).toBe(
    "/review",
  );
});

test("予定が無い期間の消化はダッシュで出す", () => {
  const { getByText } = renderWithMantine(
    <PeriodSummarySection
      activeDays={0}
      confirmedMinutes={0}
      digest={{ ...digest, confirmedCount: 0, digestRate: 0, plannedCount: 0 }}
      reviewTab="monthly"
      title="今月の状況"
    />,
  );

  expect(getByText("今月の状況")).toBeDefined();
  expect(getByText("—")).toBeDefined();
  expect(getByText("月次レビューで詳しく見る")).toBeDefined();
});
