import { convexQuery } from "@convex-dev/react-query";
import { Card, ScrollArea, Tabs, Title } from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { mondayOfWeek, todayJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { PendingComponent } from "~/components/pending-component";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { useEnsureCatalog } from "~/features/catalog/hooks/use-ensure-catalog";
import { HistoryAnalysisPanel } from "~/features/history/components/analysis/history-analysis-panel";
import { HistoryMonthView } from "~/features/history/components/history-month-view";
import { WeekAgenda } from "~/features/history/components/week-agenda";

import tabBarClasses from "~/features/history/components/history-tab-bar.module.css";

export const Route = createFileRoute("/history")({
  component: HistoryRoute,
});

type AnalysisScope = "day" | "month" | "week";

function HistoryRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<PendingComponent />}>
        <HistoryReady />
      </Suspense>
    </OwnerGate>
  );
}

function HistoryReady() {
  useEnsureCatalog();
  const today = todayJst();
  const [month, setMonth] = useState(() => new Date(`${today}T12:00:00+09:00`));
  const [selectedDateJst, setSelectedDateJst] = useState(today);
  const [activeTab, setActiveTab] = useState<string | null>("month");
  const [analysisScope, setAnalysisScope] = useState<AnalysisScope>("day");
  const yearMonth = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const weekAnchor = mondayOfWeek(selectedDateJst);

  const { data: monthBreakdown } = useSuspenseQuery(
    convexQuery(api.history.monthBreakdown, { todayJst: today, yearMonth }),
  );
  const { data: yearHeatmap } = useSuspenseQuery(
    convexQuery(api.history.yearHeatmap, { todayJst: today }),
  );
  const { data: week } = useSuspenseQuery(convexQuery(api.history.week, { dateJst: weekAnchor }));
  const { data: weekBreakdown } = useSuspenseQuery(
    convexQuery(api.history.weekBreakdown, { dateJst: weekAnchor }),
  );
  const { data: dayBreakdown } = useSuspenseQuery(
    convexQuery(api.history.dayBreakdown, { dateJst: selectedDateJst }),
  );

  const openDayAnalysis = (dateJst: string) => {
    setSelectedDateJst(dateJst);
    setMonth(new Date(`${dateJst}T12:00:00+09:00`));
    setAnalysisScope("day");
    setActiveTab("analysis");
  };

  return (
    <>
      <Title mb="md" order={1}>
        履歴
      </Title>
      <Tabs onChange={setActiveTab} value={activeTab}>
        <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
          <Tabs.Tab value="month">月</Tabs.Tab>
          <Tabs.Tab value="week">週</Tabs.Tab>
          <Tabs.Tab value="analysis">分析</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel pt="md" value="month">
          <HistoryMonthView
            events={monthBreakdown.events}
            month={month}
            onDayClick={openDayAnalysis}
            onMonthChange={setMonth}
          />
        </Tabs.Panel>

        <Tabs.Panel pt="md" value="week">
          <ScrollArea.Autosize mah={640} offsetScrollbars type="auto">
            <WeekAgenda todayJst={today} week={week} />
          </ScrollArea.Autosize>
        </Tabs.Panel>

        <Tabs.Panel pt="md" value="analysis">
          <Card>
            <HistoryAnalysisPanel
              day={dayBreakdown}
              heatmapDays={yearHeatmap.days}
              month={monthBreakdown}
              onDayClick={openDayAnalysis}
              onScopeChange={setAnalysisScope}
              scope={analysisScope}
              selectedDateJst={selectedDateJst}
              todayJst={today}
              week={weekBreakdown}
              yearMonth={yearMonth}
            />
          </Card>
          <Card mt="md" padding="md" className="text-center">
            <Link
              params={{ dateJst: selectedDateJst }}
              to="/days/$dateJst"
              className="text-blue-400 hover:underline"
            >
              選択中の日 ({selectedDateJst}) を編集
            </Link>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
