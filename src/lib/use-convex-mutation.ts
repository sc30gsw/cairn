import { useConvexMutation as useConvexReactMutation } from "@convex-dev/react-query";
import type { OptimisticUpdate } from "convex/browser";
import type { FunctionArgs, FunctionReference } from "convex/server";

type ReactMutation<Mutation extends FunctionReference<"mutation">> = ReturnType<
  typeof useConvexReactMutation<Mutation>
>;

type MutationCall<Mutation extends FunctionReference<"mutation">> = (
  ...args: Parameters<ReactMutation<Mutation>>
) => ReturnType<ReactMutation<Mutation>>;

export type ConvexMutationHandle<Mutation extends FunctionReference<"mutation">> =
  MutationCall<Mutation> & {
    mutateAsync: MutationCall<Mutation>;
    withOptimisticUpdate<T extends OptimisticUpdate<FunctionArgs<Mutation>>>(
      update: T &
        (ReturnType<T> extends Promise<any>
          ? "Optimistic update handlers must be synchronous"
          : {}),
    ): ConvexMutationHandle<Mutation>;
  };

function attachMutationHelpers<Mutation extends FunctionReference<"mutation">>(
  mutation: ReactMutation<Mutation>,
): ConvexMutationHandle<Mutation> {
  const withOptimisticUpdate = <T extends OptimisticUpdate<FunctionArgs<Mutation>>>(
    update: T &
      (ReturnType<T> extends Promise<any> ? "Optimistic update handlers must be synchronous" : {}),
  ) => attachMutationHelpers(mutation.withOptimisticUpdate(update));
  return Object.assign(mutation, {
    mutateAsync: mutation,
    withOptimisticUpdate,
  }) as ConvexMutationHandle<Mutation>;
}

export function useConvexMutation<Mutation extends FunctionReference<"mutation">>(
  mutationFn: Mutation,
): ConvexMutationHandle<Mutation> {
  return attachMutationHelpers(useConvexReactMutation(mutationFn));
}
