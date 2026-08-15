import { useConvexMutation as useConvexReactMutation } from "@convex-dev/react-query";
import type { FunctionReference } from "convex/server";

export function useConvexMutation<Mutation extends FunctionReference<"mutation">>(
  mutationFn: Mutation,
) {
  const mutateAsync = useConvexReactMutation(mutationFn);
  return { mutateAsync };
}
