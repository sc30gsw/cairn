import * as v from "valibot";

const STORAGE_KEY = "cairn:offline-mutation-queue";

const queuedMutationSchema = v.object({
  args: v.record(v.string(), v.unknown()),
  createdAt: v.number(),
  functionName: v.string(),
  id: v.string(),
});
const queueSchema = v.array(queuedMutationSchema);
type QueuedMutation = v.InferOutput<typeof queuedMutationSchema>;

export class OfflineMutationQueuedError extends Error {
  constructor() {
    super("オフラインのため操作を保存しました。接続が戻ると自動で送信します");
    this.name = "OfflineMutationQueuedError";
  }
}

function readQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  try {
    const result = v.safeParse(queueSchema, JSON.parse(raw));
    return result.success ? result.output : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: readonly QueuedMutation[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }
}

function mutationId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function enqueueOfflineMutation(functionName: string, args: Record<string, unknown>) {
  const queue = readQueue();
  queue.push({ args, createdAt: Date.now(), functionName, id: mutationId() });
  writeQueue(queue);
}

export function queuedMutationCount() {
  return readQueue().length;
}

export async function replayOfflineMutations(
  functionName: string,
  execute: (args: Record<string, unknown>) => Promise<unknown>,
) {
  const queued = readQueue().filter((entry) => entry.functionName === functionName);
  for (const entry of queued) {
    try {
      await execute(entry.args);
      writeQueue(readQueue().filter((candidate) => candidate.id !== entry.id));
    } catch {
      return;
    }
  }
}
