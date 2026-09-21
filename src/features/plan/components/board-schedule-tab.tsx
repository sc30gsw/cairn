import { convexQuery } from "@convex-dev/react-query";
import { queryOptions, usePrefetchQuery, useSuspenseQueries } from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import { BoardSchedule } from "~/features/plan/components/board-schedule";
import { usePlanView } from "~/features/plan/hooks/use-plan-view";
import { planWindowQuery, usePlanWindow } from "~/features/plan/hooks/use-plan-window";
import { toPlanScheduleBlocks } from "~/features/plan/lib/plan-event-blocks";
import { useSyncCalendarOnOpen } from "~/hooks/use-calendar-sync";
import { itemsListQuery, useItemsList } from "~/hooks/use-items-list";
import { useOptionalExternalCalendarEventsLiveQuery } from "~/lib/tanstack-db/collections";

export function BoardScheduleTab() {
  const view = usePlanView();
  const windowQuery = planWindowQuery(view.scheduleAnchor, view.scheduleView);
  const externalsQuery = convexQuery(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: view.scheduleAnchor,
    view: view.scheduleView,
  });
  usePrefetchQuery(windowQuery);
  usePrefetchQuery(externalsQuery);
  usePrefetchQuery(itemsListQuery());
  const liveExternals = useOptionalExternalCalendarEventsLiveQuery({
    anchorDateJst: view.scheduleAnchor,
    view: view.scheduleView,
  });
  const { events } = usePlanWindow(view.scheduleAnchor, view.scheduleView);
  const { data: items } = useItemsList();
  const [{ data: queriedExternals }] = useSuspenseQueries({
    queries: [queryOptions(externalsQuery)] as const satisfies readonly unknown[],
  });
  useSyncCalendarOnOpen();

  return (
    <BoardSchedule
      blocks={toPlanScheduleBlocks(events)}
      externals={
        liveExternals.isReady && liveExternals.data !== undefined
          ? liveExternals.data
          : queriedExternals
      }
      items={items}
      view={view}
    />
  );
}
