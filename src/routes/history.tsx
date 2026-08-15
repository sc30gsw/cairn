import { convexQuery } from "@convex-dev/react-query";
import { Stack, Title } from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { todayJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";
import { PendingComponent } from "~/components/pending-component";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { HistoryCalendar } from "~/features/history/components/history-calendar";
import { WeekAgenda } from "~/features/history/components/week-agenda";

export const Route = createFileRoute("/history")({
  component: HistoryRoute,
});

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
  const navigate = useNavigate();
  const today = todayJst();
  const [month, setMonth] = useState(() => new Date(`${today}T12:00:00+09:00`));
  const yearMonth = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const { data: monthData } = useSuspenseQuery(
    convexQuery(api.history.month, { todayJst: today, yearMonth }),
  );
  const { data: week } = useSuspenseQuery(
    convexQuery(api.history.week, { dateJst: `${yearMonth}-01` }),
  );

  return (
    <Stack gap="lg">
      <Title order={1}>履歴</Title>
      <HistoryCalendar
        days={monthData.days}
        month={month}
        onMonthChange={setMonth}
        onOpenDate={(dateJst) => {
          void navigate({ params: { dateJst }, to: "/days/$dateJst" });
        }}
      />
      <WeekAgenda week={week} />
    </Stack>
  );
}
