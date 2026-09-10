import type { ConvexQueryClient } from "@convex-dev/react-query";
import { DbClient } from "@tanstack/db";
import type { QueryClient } from "@tanstack/react-query";

type CreateTanStackDbClientOptions = {
  convexQueryClient: ConvexQueryClient;
  queryClient: QueryClient;
};

export function createTanStackDbClient({
  convexQueryClient,
  queryClient,
}: CreateTanStackDbClientOptions) {
  return new DbClient({ convexQueryClient, queryClient });
}
