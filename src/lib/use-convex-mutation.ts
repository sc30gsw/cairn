import { useConvexMutation as useConvexReactMutation } from "@convex-dev/react-query";
import type { FunctionReference } from "convex/server";

type ReactMutation<Mutation extends FunctionReference<"mutation">> = ReturnType<
  typeof useConvexReactMutation<Mutation>
>;

export type ConvexMutationHandle<Mutation extends FunctionReference<"mutation">> =
  ReactMutation<Mutation> & {
    mutateAsync: ReactMutation<Mutation>;
  };

export function useConvexMutation<Mutation extends FunctionReference<"mutation">>(
  mutationFn: Mutation,
): ConvexMutationHandle<Mutation> {
  const mutation = useConvexReactMutation(mutationFn);
  return Object.assign(mutation, { mutateAsync: mutation });
}
