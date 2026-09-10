import { convexQuery, type ConvexQueryClient } from "@convex-dev/react-query";
import { collectionOptions, eq, type SyncMode } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { useLiveQuery, useOptionalDbClient } from "@tanstack/react-db";
import type { QueryClient, QueryFunctionContext, QueryKey } from "@tanstack/react-query";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import type { BoardScheduleView } from "~domain/boardScheduleRange";
import type { DateJst } from "~domain/jst";

import { api } from "~/../convex/_generated/api";

type DayPage = FunctionReturnType<typeof api.queries.days.get.get>;
type DayRow = DayPage["rows"][number];
type BoardScheduleBlock = FunctionReturnType<
  typeof api.queries.boardSchedule.listForWeek.listForWeek
>[number];
type ExternalCalendarEvent = FunctionReturnType<
  typeof api.queries.calendarSync.listExternal.listExternal
>[number];
type Item = FunctionReturnType<typeof api.queries.items.list.list>[number];
type Category = FunctionReturnType<typeof api.queries.categories.list.list>[number];
type Preset = FunctionReturnType<typeof api.queries.presets.list.list>[number];
type Goal = FunctionReturnType<typeof api.queries.goals.list.list>[number];
type TargetProgress = FunctionReturnType<
  typeof api.queries.targets.listWithProgress.listWithProgress
>[number];
type Obstacle = FunctionReturnType<typeof api.queries.goals.listObstacles.listObstacles>[number];
type MethodCatalog = FunctionReturnType<typeof api.queries.methods.list.list>;
type Method = MethodCatalog["methods"][number];
type MethodLane = MethodCatalog["lanes"][number];

type DayRowsScope = {
  dateJst: DateJst;
  syncMode?: CollectionSyncMode;
  todayJst: DateJst;
};

type ScheduleScope = {
  anchorDateJst: DateJst;
  syncMode?: CollectionSyncMode;
  view: BoardScheduleView;
};

export type CollectionSyncMode = SyncMode;

const MAX_COLLECTION_DESCRIPTOR_CACHE_SIZE = 128;
const collectionDescriptorCache = new Map<string, unknown>();

function cachedCollectionDescriptor<T>(id: string, create: () => T): T {
  const cached = collectionDescriptorCache.get(id);
  if (cached !== undefined) {
    return cached as T;
  }
  const descriptor = create();
  collectionDescriptorCache.set(id, descriptor);
  if (collectionDescriptorCache.size > MAX_COLLECTION_DESCRIPTOR_CACHE_SIZE) {
    const oldestId = collectionDescriptorCache.keys().next().value;
    if (oldestId !== undefined) {
      collectionDescriptorCache.delete(oldestId);
    }
  }
  return descriptor;
}

function convexCollectionQueryFn<Query extends FunctionReference<"query">>(
  convexQueryClient: ConvexQueryClient,
) {
  const queryFn = convexQueryClient.queryFn();

  return (context: QueryFunctionContext<QueryKey>) => queryFn<Query>(context);
}

function createConvexQueryCollection<
  Query extends FunctionReference<"query">,
  Item extends object,
>({
  getKey,
  id,
  query: _query,
  queryKey,
  select,
  syncMode = "eager",
}: {
  getKey: (item: Item) => string | number;
  id: string;
  query: Query;
  queryKey: QueryKey;
  select: (data: FunctionReturnType<Query>) => Item[];
  syncMode?: CollectionSyncMode;
}) {
  const descriptorId = syncMode === "on-demand" ? `${id}:on-demand` : id;
  return cachedCollectionDescriptor(descriptorId, () =>
    collectionOptions(descriptorId, (client) =>
      queryCollectionOptions<Item>({
        getKey,
        id: descriptorId,
        networkMode: "online",
        queryClient: client.requireDependency<QueryClient>("queryClient"),
        queryFn: convexCollectionQueryFn<Query>(
          client.requireDependency<ConvexQueryClient>("convexQueryClient"),
        ),
        queryKey,
        select,
        staleTime: Number.POSITIVE_INFINITY,
        syncMode,
      }),
    ),
  );
}

export function createDayRowsCollection({ dateJst, syncMode, todayJst }: DayRowsScope) {
  const query = convexQuery(api.queries.days.get.get, { dateJst, todayJst });

  return createConvexQueryCollection({
    getKey: (row: DayRow) => row._id,
    id: `day-rows:${dateJst}:${todayJst}`,
    query: api.queries.days.get.get,
    queryKey: query.queryKey,
    select: (dayPage) => dayPage.rows,
    syncMode,
  });
}

export function createDayPageCollection({ dateJst, syncMode, todayJst }: DayRowsScope) {
  const query = convexQuery(api.queries.days.get.get, { dateJst, todayJst });

  return createConvexQueryCollection({
    getKey: (dayPage: DayPage) => dayPage.dateJst,
    id: `day-page:${dateJst}:${todayJst}`,
    query: api.queries.days.get.get,
    queryKey: query.queryKey,
    select: (dayPage) => [dayPage],
    syncMode,
  });
}

export function createBoardScheduleBlocksCollection({
  anchorDateJst,
  syncMode,
  view,
}: ScheduleScope) {
  const query = convexQuery(api.queries.boardSchedule.listForWeek.listForWeek, {
    anchorDateJst,
    view,
  });

  return createConvexQueryCollection({
    getKey: (block: BoardScheduleBlock) => block._id,
    id: `board-schedule-blocks:${anchorDateJst}:${view}`,
    query: api.queries.boardSchedule.listForWeek.listForWeek,
    queryKey: query.queryKey,
    select: (blocks) => blocks,
    syncMode,
  });
}

export function createExternalCalendarEventsCollection({
  anchorDateJst,
  syncMode,
  view,
}: ScheduleScope) {
  const query = convexQuery(api.queries.calendarSync.listExternal.listExternal, {
    anchorDateJst,
    view,
  });

  return createConvexQueryCollection({
    getKey: (event: ExternalCalendarEvent) => event._id,
    id: `external-calendar-events:${anchorDateJst}:${view}`,
    query: api.queries.calendarSync.listExternal.listExternal,
    queryKey: query.queryKey,
    select: (events) => events,
    syncMode,
  });
}

export function createCalendarSyncStatusCollection() {
  const query = convexQuery(api.queries.calendarSync.status.status, {});
  return createConvexQueryCollection({
    getKey: () => "status",
    id: "calendar-sync-status",
    query: api.queries.calendarSync.status.status,
    queryKey: query.queryKey,
    select: (status) => [status],
  });
}

export function createRunningTimerCollection() {
  const query = convexQuery(api.queries.rows.runningTimer.runningTimer, {});
  return createConvexQueryCollection({
    getKey: () => "running",
    id: "running-timer",
    query: api.queries.rows.runningTimer.runningTimer,
    queryKey: query.queryKey,
    select: (running) => (running === null ? [] : [running]),
  });
}

export function createTrashPageCollection() {
  const query = convexQuery(api.queries.trash.list.list, {});
  return createConvexQueryCollection({
    getKey: () => "trash",
    id: "trash-page",
    query: api.queries.trash.list.list,
    queryKey: query.queryKey,
    select: (trash) => [trash],
  });
}

export function createNotificationPageCollection() {
  const query = convexQuery(api.queries.notifications.list.list, {});
  return createConvexQueryCollection({
    getKey: () => "notifications",
    id: "notification-page",
    query: api.queries.notifications.list.list,
    queryKey: query.queryKey,
    select: (page) => [page],
  });
}

export function createNotificationSettingsCollection() {
  const query = convexQuery(api.queries.notifications.settings.settings, {});
  return createConvexQueryCollection({
    getKey: () => "settings",
    id: "notification-settings",
    query: api.queries.notifications.settings.settings,
    queryKey: query.queryKey,
    select: (settings) => [settings],
  });
}

export function createItemsCollection() {
  const query = convexQuery(api.queries.items.list.list, {});
  return createConvexQueryCollection({
    getKey: (item: Item) => item._id,
    id: "items",
    query: api.queries.items.list.list,
    queryKey: query.queryKey,
    select: (items) => items,
  });
}

export function createCategoriesCollection() {
  const query = convexQuery(api.queries.categories.list.list, {});
  return createConvexQueryCollection({
    getKey: (category: Category) => category._id,
    id: "categories",
    query: api.queries.categories.list.list,
    queryKey: query.queryKey,
    select: (categories) => categories,
  });
}

export function createPresetsCollection() {
  const query = convexQuery(api.queries.presets.list.list, {});
  return createConvexQueryCollection({
    getKey: (preset: Preset) => preset._id,
    id: "presets",
    query: api.queries.presets.list.list,
    queryKey: query.queryKey,
    select: (presets) => presets,
  });
}

export function createPresetSettingsCollection() {
  const query = convexQuery(api.queries.presets.settings.settings, {});
  return createConvexQueryCollection({
    getKey: () => "settings",
    id: "preset-settings",
    query: api.queries.presets.settings.settings,
    queryKey: query.queryKey,
    select: (settings) => [settings],
  });
}

export function createGoalsCollection() {
  const query = convexQuery(api.queries.goals.list.list, {});
  return createConvexQueryCollection({
    getKey: (goal: Goal) => goal._id,
    id: "goals",
    query: api.queries.goals.list.list,
    queryKey: query.queryKey,
    select: (goals) => goals,
  });
}

export function createTargetsWithProgressCollection(weekStartJst: DateJst) {
  const query = convexQuery(api.queries.targets.listWithProgress.listWithProgress, {
    weekStartJst,
  });
  return createConvexQueryCollection({
    getKey: (target: TargetProgress) => target._id,
    id: `targets-with-progress:${weekStartJst}`,
    query: api.queries.targets.listWithProgress.listWithProgress,
    queryKey: query.queryKey,
    select: (targets) => targets,
  });
}

export function createObstaclesCollection() {
  const query = convexQuery(api.queries.goals.listObstacles.listObstacles, {});
  return createConvexQueryCollection({
    getKey: (obstacle: Obstacle) => obstacle._id,
    id: "obstacles",
    query: api.queries.goals.listObstacles.listObstacles,
    queryKey: query.queryKey,
    select: (obstacles) => obstacles,
  });
}

export function createMethodsCollection() {
  const query = convexQuery(api.queries.methods.list.list, {});
  return createConvexQueryCollection({
    getKey: (method: Method) => method._id,
    id: "methods",
    query: api.queries.methods.list.list,
    queryKey: query.queryKey,
    select: (catalog) => catalog.methods,
  });
}

export function createMethodLanesCollection() {
  const query = convexQuery(api.queries.methods.list.list, {});
  return createConvexQueryCollection({
    getKey: (lane: MethodLane) => lane._id,
    id: "method-lanes",
    query: api.queries.methods.list.list,
    queryKey: query.queryKey,
    select: (catalog) => catalog.lanes,
  });
}

export function useOptionalDayPageLiveQuery(scope: DayRowsScope) {
  const client = useOptionalDbClient();
  const descriptor = createDayPageCollection(scope);

  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ dayPage: descriptor }).findOne()),
  });
}

export function useOptionalBoardScheduleBlocksLiveQuery(scope: ScheduleScope) {
  const client = useOptionalDbClient();
  const descriptor = createBoardScheduleBlocksCollection(scope);

  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ blocks: descriptor })),
  });
}

export function useOptionalExternalCalendarEventsLiveQuery(scope: ScheduleScope) {
  const client = useOptionalDbClient();
  const descriptor = createExternalCalendarEventsCollection(scope);

  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ events: descriptor })),
  });
}

export function useOptionalCalendarSyncStatusLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createCalendarSyncStatusCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ status: descriptor }).findOne()),
  });
}

export function useOptionalRunningTimerLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createRunningTimerCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ running: descriptor }).findOne()),
  });
}

export function useOptionalTrashPageLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createTrashPageCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ trash: descriptor }).findOne()),
  });
}

export function useOptionalNotificationPageLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createNotificationPageCollection();
  return useLiveQuery({
    client,
    query: (query) =>
      client === undefined ? null : query.from({ notifications: descriptor }).findOne(),
  });
}

export function useOptionalNotificationSettingsLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createNotificationSettingsCollection();
  return useLiveQuery({
    client,
    query: (query) =>
      client === undefined ? null : query.from({ settings: descriptor }).findOne(),
  });
}

export function useOptionalItemsLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createItemsCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ items: descriptor })),
  });
}

export function useOptionalCategoriesLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createCategoriesCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ categories: descriptor })),
  });
}

export function useOptionalPresetsLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createPresetsCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ presets: descriptor })),
  });
}

export function useOptionalPresetSettingsLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createPresetSettingsCollection();
  return useLiveQuery({
    client,
    query: (query) =>
      client === undefined ? null : query.from({ settings: descriptor }).findOne(),
  });
}

export function useOptionalGoalsLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createGoalsCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ goals: descriptor })),
  });
}

export function useOptionalTargetsWithProgressLiveQuery(weekStartJst: DateJst) {
  const client = useOptionalDbClient();
  const descriptor = createTargetsWithProgressCollection(weekStartJst);
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ targets: descriptor })),
  });
}

export function useOptionalObstaclesLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createObstaclesCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ obstacles: descriptor })),
  });
}

export function useOptionalMethodLanesLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createMethodLanesCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ lanes: descriptor })),
  });
}

export function useOptionalMethodsWithLanesLiveQuery() {
  const client = useOptionalDbClient();
  const methods = createMethodsCollection();
  const lanes = createMethodLanesCollection();

  return useLiveQuery({
    client,
    query: (query) =>
      client === undefined
        ? null
        : query
            .from({ methods })
            .leftJoin({ lanes }, ({ methods: methodRows, lanes: laneRows }) =>
              eq(methodRows.laneId, laneRows._id),
            )
            .select(({ methods: methodRows, lanes: laneRows }) => ({
              lane: laneRows,
              method: methodRows,
            })),
  });
}
