import { convexQuery, type ConvexQueryClient } from "@convex-dev/react-query";
import { collectionOptions, type SyncMode } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { QueryClient, QueryFunctionContext, QueryKey } from "@tanstack/react-query";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";

export type ValueCollectionItem<Value> = { value: Value };
export type CollectionSyncMode = SyncMode;

function convexCollectionQueryFn<Query extends FunctionReference<"query">>(
  convexQueryClient: ConvexQueryClient,
) {
  const queryFn = convexQueryClient.queryFn();
  return (context: QueryFunctionContext<QueryKey>) => queryFn<Query>(context);
}

export function createConvexQueryCollection<
  Query extends FunctionReference<"query">,
  Item extends object,
>({
  args,
  getKey,
  id,
  query,
  queryKey: providedQueryKey,
  select,
  syncMode = "eager",
}: {
  args?: FunctionArgs<Query>;
  getKey: (item: Item) => string | number;
  id: string;
  query: Query;
  queryKey?: QueryKey;
  select: (data: FunctionReturnType<Query>) => Item[];
  syncMode?: CollectionSyncMode;
}) {
  const queryKey =
    providedQueryKey ?? (args === undefined ? undefined : convexQuery(query, args).queryKey);
  if (queryKey === undefined) {
    throw new Error(`Collection ${id} requires query arguments or a query key`);
  }
  const descriptorId = syncMode === "on-demand" ? `${id}:on-demand` : id;
  return collectionOptions(descriptorId, (client) =>
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
  );
}

export function createConvexValueCollection<Query extends FunctionReference<"query">>({
  args,
  id,
  query,
  queryKey,
  syncMode,
}: {
  args?: FunctionArgs<Query>;
  id: string;
  query: Query;
  queryKey?: QueryKey;
  syncMode?: CollectionSyncMode;
}) {
  return createConvexQueryCollection<Query, ValueCollectionItem<FunctionReturnType<Query>>>({
    args,
    getKey: () => "value",
    id,
    query,
    queryKey,
    select: (value) => [{ value }],
    syncMode,
  });
}

export function collectionId(prefix: string, args: object): string {
  const sortedEntries = Object.entries(args).sort(([left], [right]) => left.localeCompare(right));
  return `${prefix}:${JSON.stringify(sortedEntries)}`;
}

export function unwrapValueLiveResult<
  Value,
  Live extends {
    data: ValueCollectionItem<Value> | undefined;
    isReady: boolean;
  } = {
    data: ValueCollectionItem<Value> | undefined;
    isReady: boolean;
  },
>(live: Live) {
  return { ...live, data: live.data?.value };
}
