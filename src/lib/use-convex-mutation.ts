import { useConvexMutation as useConvexReactMutation } from "@convex-dev/react-query";
import type { OptimisticUpdate } from "convex/browser";
import type { ReactMutation } from "convex/react";
import type { FunctionArgs, FunctionReference } from "convex/server";

type MutationCall<Mutation extends FunctionReference<"mutation">> = (
  ...args: Parameters<ReactMutation<Mutation>>
) => ReturnType<ReactMutation<Mutation>>;

type ConvexMutationHandle<Mutation extends FunctionReference<"mutation">> =
  MutationCall<Mutation> & {
    mutateAsync: MutationCall<Mutation>;
    withOptimisticUpdate<Update extends OptimisticUpdate<FunctionArgs<Mutation>>>(
      update: Update &
        (ReturnType<Update> extends Promise<unknown>
          ? "Optimistic update handlers must be synchronous"
          : object),
    ): ConvexMutationHandle<Mutation>;
  };

function attachMutationHelpers<Mutation extends FunctionReference<"mutation">>(
  mutation: ReactMutation<Mutation>,
): ConvexMutationHandle<Mutation> {
  const invoke: MutationCall<Mutation> = (...args) => mutation(...args);
  return Object.assign(invoke, {
    mutateAsync: invoke,
    withOptimisticUpdate: (...args: Parameters<ReactMutation<Mutation>["withOptimisticUpdate"]>) =>
      attachMutationHelpers(mutation.withOptimisticUpdate(...args)),
  });
}

export function useConvexMutation<Mutation extends FunctionReference<"mutation">>(
  mutationFn: Mutation,
) {
  return attachMutationHelpers(useConvexReactMutation(mutationFn));
}
