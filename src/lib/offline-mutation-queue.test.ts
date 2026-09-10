import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import {
  enqueueOfflineMutation,
  OfflineMutationQueuedError,
  queuedMutationCount,
  replayOfflineMutations,
} from "~/lib/offline-mutation-queue";

afterEach(() => window.localStorage.clear());

describe("offline mutation queue", () => {
  test("persists entries and replays them in order", async () => {
    enqueueOfflineMutation("rows/add:add", { content: "A" });
    enqueueOfflineMutation("rows/add:add", { content: "B" });
    const execute = vi.fn(async () => undefined);

    expect(queuedMutationCount()).toBe(2);
    await replayOfflineMutations("rows/add:add", execute);

    expect(execute).toHaveBeenNthCalledWith(1, { content: "A" });
    expect(execute).toHaveBeenNthCalledWith(2, { content: "B" });
    expect(queuedMutationCount()).toBe(0);
  });

  test("keeps a failed entry for the next reconnect", async () => {
    enqueueOfflineMutation("rows/add:add", { content: "A" });
    const execute = vi.fn(async () => {
      throw new Error("offline");
    });

    await replayOfflineMutations("rows/add:add", execute);
    expect(queuedMutationCount()).toBe(1);
  });

  test("uses a dedicated error for an offline enqueue", () => {
    expect(new OfflineMutationQueuedError()).toBeInstanceOf(Error);
  });
});
