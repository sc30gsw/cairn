import { useLiveQuery, useOptionalDbClient } from "@tanstack/react-db";
import type { FunctionArgs, FunctionReturnType } from "convex/server";

import { api } from "~/../convex/_generated/api";
import {
  createConvexQueryCollection,
  createConvexValueCollection,
  type CollectionSyncMode,
  unwrapValueLiveResult,
} from "~/lib/tanstack-db/collection-factory";

type DayPage = FunctionReturnType<typeof api.queries.days.get.get>;
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
type DayRowsScope = FunctionArgs<typeof api.queries.days.get.get> & {
  syncMode?: CollectionSyncMode;
};
type ScheduleScope = FunctionArgs<typeof api.queries.boardSchedule.listForWeek.listForWeek> & {
  syncMode?: CollectionSyncMode;
};
type TargetsScope = FunctionArgs<typeof api.queries.targets.listWithProgress.listWithProgress>;

export function createDayPageCollection({ dateJst, syncMode, todayJst }: DayRowsScope) {
  return createConvexQueryCollection({
    args: { dateJst, todayJst },
    getKey: (dayPage: DayPage) => dayPage.dateJst,
    id: `day-page:${dateJst}:${todayJst}`,
    query: api.queries.days.get.get,
    select: (dayPage) => [dayPage],
    syncMode,
  });
}

export function createBoardScheduleBlocksCollection({
  anchorDateJst,
  syncMode,
  view,
}: ScheduleScope) {
  return createConvexQueryCollection({
    args: { anchorDateJst, view },
    getKey: (block: BoardScheduleBlock) => block._id,
    id: `board-schedule-blocks:${anchorDateJst}:${view}`,
    query: api.queries.boardSchedule.listForWeek.listForWeek,
    select: (blocks) => blocks,
    syncMode,
  });
}

export function createExternalCalendarEventsCollection({
  anchorDateJst,
  syncMode,
  view,
}: ScheduleScope) {
  return createConvexQueryCollection({
    args: { anchorDateJst, view },
    getKey: (event: ExternalCalendarEvent) => event._id,
    id: `external-calendar-events:${anchorDateJst}:${view}`,
    query: api.queries.calendarSync.listExternal.listExternal,
    select: (events) => events,
    syncMode,
  });
}

function createCalendarSyncStatusCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: () => "status",
    id: "calendar-sync-status",
    query: api.queries.calendarSync.status.status,
    select: (status) => [status],
  });
}

function createRunningTimerCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: () => "running",
    id: "running-timer",
    query: api.queries.rows.runningTimer.runningTimer,
    select: (running) => (running === null ? [] : [running]),
  });
}

function createTrashPageCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: () => "trash",
    id: "trash-page",
    query: api.queries.trash.list.list,
    select: (trash) => [trash],
  });
}

function createNotificationPageCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: () => "notifications",
    id: "notification-page",
    query: api.queries.notifications.list.list,
    select: (page) => [page],
  });
}

function createNotificationSettingsCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: () => "settings",
    id: "notification-settings",
    query: api.queries.notifications.settings.settings,
    select: (settings) => [settings],
  });
}

function createItemsCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: (item: Item) => item._id,
    id: "items",
    query: api.queries.items.list.list,
    select: (items) => items,
  });
}

function createCategoriesCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: (category: Category) => category._id,
    id: "categories",
    query: api.queries.categories.list.list,
    select: (categories) => categories,
  });
}

function createPresetsCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: (preset: Preset) => preset._id,
    id: "presets",
    query: api.queries.presets.list.list,
    select: (presets) => presets,
  });
}

function createPresetSettingsCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: () => "settings",
    id: "preset-settings",
    query: api.queries.presets.settings.settings,
    select: (settings) => [settings],
  });
}

function createGoalsCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: (goal: Goal) => goal._id,
    id: "goals",
    query: api.queries.goals.list.list,
    select: (goals) => goals,
  });
}

function createTargetsWithProgressCollection(weekStartJst: TargetsScope["weekStartJst"]) {
  return createConvexQueryCollection({
    args: { weekStartJst },
    getKey: (target: TargetProgress) => target._id,
    id: `targets-with-progress:${weekStartJst}`,
    query: api.queries.targets.listWithProgress.listWithProgress,
    select: (targets) => targets,
  });
}

function createObstaclesCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: (obstacle: Obstacle) => obstacle._id,
    id: "obstacles",
    query: api.queries.goals.listObstacles.listObstacles,
    select: (obstacles) => obstacles,
  });
}

function createMethodCatalogCollection() {
  return createConvexValueCollection({
    args: {},
    id: "method-catalog",
    query: api.queries.methods.list.list,
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

export function useOptionalTargetsWithProgressLiveQuery(
  weekStartJst: TargetsScope["weekStartJst"],
) {
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

export function useOptionalMethodCatalogLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createMethodCatalogCollection();
  const live = useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ catalog: descriptor }).findOne()),
  });
  return unwrapValueLiveResult<MethodCatalog>(live);
}
