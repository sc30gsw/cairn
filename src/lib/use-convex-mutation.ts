import { useConvexMutation as useConvexReactMutation } from "@convex-dev/react-query";
import type { OptimisticUpdate } from "convex/browser";
import { getFunctionName, type FunctionArgs, type FunctionReference } from "convex/server";
import { useEffect } from "react";

import {
  enqueueOfflineMutation,
  OfflineMutationQueuedError,
  replayOfflineMutations,
} from "~/lib/offline-mutation-queue";

type ReactMutation<Mutation extends FunctionReference<"mutation">> = ReturnType<
  typeof useConvexReactMutation<Mutation>
>;

type MutationCall<Mutation extends FunctionReference<"mutation">> = (
  ...args: Parameters<ReactMutation<Mutation>>
) => ReturnType<ReactMutation<Mutation>>;

function canQueueOffline(functionName: string) {
  return !functionName.includes("calendarAuth") && !functionName.includes("calendarSync");
}

export type ConvexMutationHandle<Mutation extends FunctionReference<"mutation">> =
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
  functionName: string,
): ConvexMutationHandle<Mutation> {
  const invoke: MutationCall<Mutation> = async (...args) => {
    const mutationArgs = args[0] ?? {};
    if (
      canQueueOffline(functionName) &&
      typeof window !== "undefined" &&
      !window.navigator.onLine
    ) {
      enqueueOfflineMutation(functionName, mutationArgs);
      throw new OfflineMutationQueuedError();
    }
    try {
      return await mutation(...args);
    } catch (error) {
      if (
        canQueueOffline(functionName) &&
        typeof window !== "undefined" &&
        !window.navigator.onLine
      ) {
        enqueueOfflineMutation(functionName, mutationArgs);
      }
      throw error;
    }
  };

  function withOptimisticUpdate<Update extends OptimisticUpdate<FunctionArgs<Mutation>>>(
    update: Update &
      (ReturnType<Update> extends Promise<unknown>
        ? "Optimistic update handlers must be synchronous"
        : object),
  ) {
    const handler: OptimisticUpdate<FunctionArgs<Mutation>> = (localStore, args) => {
      update(localStore, args);
    };
    return attachMutationHelpers(mutation.withOptimisticUpdate(handler), functionName);
  }

  return Object.assign(invoke, {
    mutateAsync: invoke,
    withOptimisticUpdate,
  });
}

export function useConvexMutation<Mutation extends FunctionReference<"mutation">>(
  mutationFn: Mutation,
): ConvexMutationHandle<Mutation> {
  const mutation = useConvexReactMutation(mutationFn);
  useEffect(() => {
    const functionName = getFunctionName(mutationFn);
    if (!canQueueOffline(functionName)) return;
    const replay = () => {
      void replayOfflineMutations(functionName, (args) =>
        mutation(args as Parameters<ReactMutation<Mutation>>[0]),
      );
    };
    replay();
    window.addEventListener("online", replay);
    return () => window.removeEventListener("online", replay);
  }, [mutation, mutationFn]);
  return attachMutationHelpers(mutation, getFunctionName(mutationFn));
}
