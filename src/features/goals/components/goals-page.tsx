import { useSuspenseQueries } from "@tanstack/react-query";
import { Suspense } from "react";
import { mondayOfWeek } from "~domain/jst";

import { GoalsBoard } from "~/features/goals/components/goals-board";
import { GoalsPending } from "~/features/goals/components/goals-pending";
import { goalsListQuery, obstaclesListQuery } from "~/hooks/goals-queries";
import { targetsWithProgressQuery } from "~/hooks/targets-queries";
import { categoriesListQuery } from "~/hooks/use-categories-list";
import { itemsListQuery } from "~/hooks/use-items-list";
import { useTodayJst } from "~/hooks/use-today-jst";
import { parallelConvexQuery } from "~/lib/parallel-convex-query";

export function GoalsPage() {
  return (
    <Suspense fallback={<GoalsPending />}>
      <GoalsReady />
    </Suspense>
  );
}

function GoalsReady() {
  const today = useTodayJst();
  const weekStart = mondayOfWeek(today);
  //? 5本の useSuspenseQuery を直列に並べると5回分の往復が直列化するため、useSuspenseQueries で
  //? 並列取得する(パフォーマンス)。引数の SSoT は各 hooks のクエリファクトリのまま。
  const [
    { data: categories },
    { data: goals },
    { data: items },
    { data: obstacles },
    { data: targets },
  ] = useSuspenseQueries({
    queries: [
      parallelConvexQuery(categoriesListQuery()),
      parallelConvexQuery(goalsListQuery()),
      parallelConvexQuery(itemsListQuery()),
      parallelConvexQuery(obstaclesListQuery()),
      parallelConvexQuery(targetsWithProgressQuery(weekStart)),
    ],
  });

  return (
    <GoalsBoard
      categories={categories}
      goals={goals}
      items={items}
      obstacles={obstacles}
      targets={targets}
      todayJst={today}
    />
  );
}
