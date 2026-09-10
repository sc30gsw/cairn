import { convexQuery } from "@convex-dev/react-query";
import {
  queryOptions,
  usePrefetchQuery,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";

import { api } from "~/../convex/_generated/api";
import { BoardSchedule } from "~/features/board/components/board-schedule";
import { useBoardView } from "~/features/board/hooks/use-board-view";
import { useSyncCalendarOnOpen } from "~/hooks/use-calendar-sync";
import { dayPageQueryOptions, useEnsureDayOpen } from "~/hooks/use-open-and-load-day";
import {
  useOptionalBoardScheduleBlocksLiveQuery,
  useOptionalDayPageLiveQuery,
  useOptionalExternalCalendarEventsLiveQuery,
} from "~/lib/tanstack-db/collections";

export function BoardScheduleTab() {
  const view = useBoardView();
  const dayQuery = dayPageQueryOptions(view.selectedDateJst, view.today);
  const blocksQuery = convexQuery(api.queries.boardSchedule.listForWeek.listForWeek, {
    anchorDateJst: view.scheduleAnchor,
    view: view.scheduleView,
  });
  const externalsQuery = convexQuery(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst: view.scheduleAnchor,
    view: view.scheduleView,
  });
  const queryClient = useQueryClient();
  if (typeof window !== "undefined") {
    void queryClient.prefetchQuery(dayQuery);
  }
  usePrefetchQuery(blocksQuery);
  usePrefetchQuery(externalsQuery);
  useEnsureDayOpen(view.selectedDateJst, view.today);
  const liveDay = useOptionalDayPageLiveQuery({
    dateJst: view.selectedDateJst,
    todayJst: view.today,
  });
  const liveBlocks = useOptionalBoardScheduleBlocksLiveQuery({
    anchorDateJst: view.scheduleAnchor,
    view: view.scheduleView,
  });
  const liveExternals = useOptionalExternalCalendarEventsLiveQuery({
    anchorDateJst: view.scheduleAnchor,
    view: view.scheduleView,
  });
  const [{ data: queriedDay }, { data: queriedBlocks }, { data: queriedExternals }] =
    useSuspenseQueries({
      queries: [
        queryOptions(dayQuery),
        queryOptions(blocksQuery),
        queryOptions(externalsQuery),
      ] as const,
    });
  useSyncCalendarOnOpen();

  return (
    <BoardSchedule
      blocks={liveBlocks.isReady && liveBlocks.data !== undefined ? liveBlocks.data : queriedBlocks}
      externals={
        liveExternals.isReady && liveExternals.data !== undefined
          ? liveExternals.data
          : queriedExternals
      }
      rows={(liveDay.isReady && liveDay.data !== undefined ? liveDay.data : queriedDay).rows}
      view={view}
    />
  );
}
