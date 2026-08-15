import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexReactMutation } from "convex/react";
import type { FunctionArgs, FunctionReference } from "convex/server";

export function useConvexMutation<Mutation extends FunctionReference<"mutation">>(
  mutationFn: Mutation,
) {
  const mutateConvex = useConvexReactMutation(mutationFn);
  return useMutation({
    mutationFn: (args: FunctionArgs<Mutation>) => mutateConvex(args),
  });
}
