import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vite-plus/test";

import { createTanStackDbClient } from "~/lib/tanstack-db/runtime";

describe("createTanStackDbClient", () => {
  test("keeps dependencies within the runtime client", () => {
    const convexQueryClient = new ConvexQueryClient("https://example.convex.cloud");
    const queryClient = new QueryClient();
    const dbClient = createTanStackDbClient({ convexQueryClient, queryClient });

    expect(dbClient.getDependency<QueryClient>("queryClient")).toBe(queryClient);
    expect(dbClient.getDependency<ConvexQueryClient>("convexQueryClient")).toBe(convexQueryClient);
  });
});
