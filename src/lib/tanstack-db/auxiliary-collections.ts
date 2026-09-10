import { useLiveQuery, useOptionalDbClient } from "@tanstack/react-db";
import type { FunctionArgs, FunctionReturnType } from "convex/server";

import { api } from "~/../convex/_generated/api";
import {
  collectionId,
  createConvexQueryCollection,
  createConvexValueCollection,
  unwrapValueLiveResult,
} from "~/lib/tanstack-db/collection-factory";

type AuthPublicConfig = FunctionReturnType<typeof api.queries.auth.publicConfig.publicConfig>;
type SetupStatus = FunctionReturnType<typeof api.queries.setup.status.status>;
type HistorySearch = FunctionReturnType<typeof api.queries.history.search.search>;
type RecentConcreteActions = FunctionReturnType<
  typeof api.queries.items.recentConcreteActions.recentConcreteActions
>;
type WeeklyReview = FunctionReturnType<typeof api.queries.review.weeklyReview.weeklyReview>;
type MonthlyReview = FunctionReturnType<typeof api.queries.review.monthlyReview.monthlyReview>;
type HistoryMonthBreakdown = FunctionReturnType<
  typeof api.queries.history.monthBreakdown.monthBreakdown
>;
type HistoryWeek = FunctionReturnType<typeof api.queries.history.week.week>;
type HistoryWeekBreakdown = FunctionReturnType<
  typeof api.queries.history.weekBreakdown.weekBreakdown
>;
type HistoryDayBreakdown = FunctionReturnType<typeof api.queries.history.dayBreakdown.dayBreakdown>;
type HistoryYearHeatmap = FunctionReturnType<typeof api.queries.history.yearHeatmap.yearHeatmap>;
type HistoryPresetReview = FunctionReturnType<typeof api.queries.history.presetReview.presetReview>;
type PushSubscriptions = FunctionReturnType<
  typeof api.queries.notifications.pushSubscriptions.pushSubscriptions
>;
type WebPushConfig = FunctionReturnType<
  typeof api.queries.notifications.webPushConfig.webPushConfig
>;
type AvatarDisplayUrl = FunctionReturnType<typeof api.queries.profile.getAvatarUrl.getAvatarUrl>;

type HistorySearchScope = FunctionArgs<typeof api.queries.history.search.search>;
type RecentConcreteActionsScope = FunctionArgs<
  typeof api.queries.items.recentConcreteActions.recentConcreteActions
>;
type WeeklyReviewScope = FunctionArgs<typeof api.queries.review.weeklyReview.weeklyReview>;
type MonthlyReviewScope = FunctionArgs<typeof api.queries.review.monthlyReview.monthlyReview>;
type HistoryMonthBreakdownScope = FunctionArgs<
  typeof api.queries.history.monthBreakdown.monthBreakdown
>;
type HistoryWeekScope = FunctionArgs<typeof api.queries.history.week.week>;
type HistoryWeekBreakdownScope = FunctionArgs<
  typeof api.queries.history.weekBreakdown.weekBreakdown
>;
type HistoryDayBreakdownScope = FunctionArgs<typeof api.queries.history.dayBreakdown.dayBreakdown>;
type HistoryYearHeatmapScope = FunctionArgs<typeof api.queries.history.yearHeatmap.yearHeatmap>;
type HistoryPresetReviewScope = FunctionArgs<typeof api.queries.history.presetReview.presetReview>;

export function createAuthPublicConfigCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: () => "config",
    id: "auth-public-config",
    query: api.queries.auth.publicConfig.publicConfig,
    select: (config: AuthPublicConfig) => [config],
  });
}

export function createSetupStatusCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: () => "status",
    id: "setup-status",
    query: api.queries.setup.status.status,
    select: (status: SetupStatus) => [status],
  });
}

export function createHistorySearchCollection(scope: HistorySearchScope) {
  return createConvexQueryCollection({
    args: scope,
    getKey: () => "result",
    id: collectionId("history-search", scope),
    query: api.queries.history.search.search,
    select: (result: HistorySearch) => [result],
  });
}

function createRecentConcreteActionsCollection(scope: RecentConcreteActionsScope) {
  return createConvexValueCollection({
    args: scope,
    id: collectionId("recent-concrete-actions", scope),
    query: api.queries.items.recentConcreteActions.recentConcreteActions,
  });
}

function createWeeklyReviewCollection(scope: WeeklyReviewScope) {
  return createConvexQueryCollection({
    args: scope,
    getKey: () => "result",
    id: collectionId("weekly-review", scope),
    query: api.queries.review.weeklyReview.weeklyReview,
    select: (result: WeeklyReview) => [result],
  });
}

function createMonthlyReviewCollection(scope: MonthlyReviewScope) {
  return createConvexQueryCollection({
    args: scope,
    getKey: () => "result",
    id: collectionId("monthly-review", scope),
    query: api.queries.review.monthlyReview.monthlyReview,
    select: (result: MonthlyReview) => [result],
  });
}

function createHistoryMonthBreakdownCollection(scope: HistoryMonthBreakdownScope) {
  return createConvexQueryCollection({
    args: scope,
    getKey: () => "result",
    id: collectionId("history-month-breakdown", scope),
    query: api.queries.history.monthBreakdown.monthBreakdown,
    select: (result: HistoryMonthBreakdown) => [result],
  });
}

function createHistoryWeekCollection(scope: HistoryWeekScope) {
  return createConvexQueryCollection({
    args: scope,
    getKey: () => "result",
    id: collectionId("history-week", scope),
    query: api.queries.history.week.week,
    select: (result: HistoryWeek) => [result],
  });
}

function createHistoryWeekBreakdownCollection(scope: HistoryWeekBreakdownScope) {
  return createConvexQueryCollection({
    args: scope,
    getKey: () => "result",
    id: collectionId("history-week-breakdown", scope),
    query: api.queries.history.weekBreakdown.weekBreakdown,
    select: (result: HistoryWeekBreakdown) => [result],
  });
}

function createHistoryDayBreakdownCollection(scope: HistoryDayBreakdownScope) {
  return createConvexQueryCollection({
    args: scope,
    getKey: () => "result",
    id: collectionId("history-day-breakdown", scope),
    query: api.queries.history.dayBreakdown.dayBreakdown,
    select: (result: HistoryDayBreakdown) => [result],
  });
}

function createHistoryYearHeatmapCollection(scope: HistoryYearHeatmapScope) {
  return createConvexQueryCollection({
    args: scope,
    getKey: () => "result",
    id: collectionId("history-year-heatmap", scope),
    query: api.queries.history.yearHeatmap.yearHeatmap,
    select: (result: HistoryYearHeatmap) => [result],
  });
}

function createHistoryPresetReviewCollection(scope: HistoryPresetReviewScope) {
  return createConvexQueryCollection({
    args: scope,
    getKey: () => "result",
    id: collectionId("history-preset-review", scope),
    query: api.queries.history.presetReview.presetReview,
    select: (result: HistoryPresetReview) => [result],
  });
}

function createPushSubscriptionsCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: (subscription: PushSubscriptions[number]) => subscription._id,
    id: "push-subscriptions",
    query: api.queries.notifications.pushSubscriptions.pushSubscriptions,
    select: (subscriptions: PushSubscriptions) => subscriptions,
  });
}

function createWebPushConfigCollection() {
  return createConvexQueryCollection({
    args: {},
    getKey: () => "config",
    id: "web-push-config",
    query: api.queries.notifications.webPushConfig.webPushConfig,
    select: (config: WebPushConfig) => [config],
  });
}

function createAvatarDisplayUrlCollection(
  storageId: FunctionArgs<typeof api.queries.profile.getAvatarUrl.getAvatarUrl>["storageId"],
) {
  return createConvexValueCollection({
    args: { storageId },
    id: `avatar-display-url:${storageId}`,
    query: api.queries.profile.getAvatarUrl.getAvatarUrl,
  });
}

export function useOptionalAuthPublicConfigLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createAuthPublicConfigCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ config: descriptor }).findOne()),
  });
}

export function useOptionalSetupStatusLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createSetupStatusCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ status: descriptor }).findOne()),
  });
}

export function useOptionalHistorySearchLiveQuery(scope: HistorySearchScope) {
  const client = useOptionalDbClient();
  const descriptor = createHistorySearchCollection(scope);
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ result: descriptor }).findOne()),
  });
}

export function useOptionalRecentConcreteActionsLiveQuery(scope: RecentConcreteActionsScope) {
  const client = useOptionalDbClient();
  const descriptor = createRecentConcreteActionsCollection(scope);
  const live = useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ result: descriptor }).findOne()),
  });
  return unwrapValueLiveResult<RecentConcreteActions>(live);
}

export function useOptionalWeeklyReviewLiveQuery(scope: WeeklyReviewScope) {
  const client = useOptionalDbClient();
  const descriptor = createWeeklyReviewCollection(scope);
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ result: descriptor }).findOne()),
  });
}

export function useOptionalMonthlyReviewLiveQuery(scope: MonthlyReviewScope) {
  const client = useOptionalDbClient();
  const descriptor = createMonthlyReviewCollection(scope);
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ result: descriptor }).findOne()),
  });
}

export function useOptionalHistoryMonthBreakdownLiveQuery(scope: HistoryMonthBreakdownScope) {
  const client = useOptionalDbClient();
  const descriptor = createHistoryMonthBreakdownCollection(scope);
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ result: descriptor }).findOne()),
  });
}

export function useOptionalHistoryWeekLiveQuery(scope: HistoryWeekScope) {
  const client = useOptionalDbClient();
  const descriptor = createHistoryWeekCollection(scope);
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ result: descriptor }).findOne()),
  });
}

export function useOptionalHistoryWeekBreakdownLiveQuery(scope: HistoryWeekBreakdownScope) {
  const client = useOptionalDbClient();
  const descriptor = createHistoryWeekBreakdownCollection(scope);
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ result: descriptor }).findOne()),
  });
}

export function useOptionalHistoryDayBreakdownLiveQuery(scope: HistoryDayBreakdownScope) {
  const client = useOptionalDbClient();
  const descriptor = createHistoryDayBreakdownCollection(scope);
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ result: descriptor }).findOne()),
  });
}

export function useOptionalHistoryYearHeatmapLiveQuery(scope: HistoryYearHeatmapScope) {
  const client = useOptionalDbClient();
  const descriptor = createHistoryYearHeatmapCollection(scope);
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ result: descriptor }).findOne()),
  });
}

export function useOptionalHistoryPresetReviewLiveQuery(scope: HistoryPresetReviewScope) {
  const client = useOptionalDbClient();
  const descriptor = createHistoryPresetReviewCollection(scope);
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ result: descriptor }).findOne()),
  });
}

export function useOptionalPushSubscriptionsLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createPushSubscriptionsCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ subscriptions: descriptor })),
  });
}

export function useOptionalWebPushConfigLiveQuery() {
  const client = useOptionalDbClient();
  const descriptor = createWebPushConfigCollection();
  return useLiveQuery({
    client,
    query: (query) => (client === undefined ? null : query.from({ config: descriptor }).findOne()),
  });
}

export function useOptionalAvatarDisplayUrlLiveQuery(
  storageId: FunctionArgs<typeof api.queries.profile.getAvatarUrl.getAvatarUrl>["storageId"] | null,
) {
  const client = useOptionalDbClient();
  const descriptor = storageId === null ? undefined : createAvatarDisplayUrlCollection(storageId);
  const live = useLiveQuery({
    client,
    query: (query) =>
      client === undefined || descriptor === undefined
        ? null
        : query.from({ result: descriptor }).findOne(),
  });
  return unwrapValueLiveResult<AvatarDisplayUrl>(live);
}
