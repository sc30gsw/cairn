import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { PulledEvent } from "../../lib/validators";

const APPLY_CHUNK_SIZE = 200;

type ApplyPulledEventsArgs = {
  calendarId: string;
  events: readonly PulledEvent[];
  finish: { keepEventIds: string[] | null; syncToken: string | null };
  ownerId: string;
  todayJst: string;
};

export async function applyPulledEventsInOrder(
  ctx: Pick<ActionCtx, "runMutation">,
  args: ApplyPulledEventsArgs,
  chunkSize: number = APPLY_CHUNK_SIZE,
): Promise<void> {
  const batches = chunk(args.events, chunkSize);
  for (const [index, events] of batches.entries()) {
    const last = index === batches.length - 1;
    // oxlint-disable-next-line react-doctor/async-await-in-loop
    await ctx.runMutation(internal.mutations.calendarSync.applyPull.applyPull, {
      calendarId: args.calendarId,
      events: [...events],
      finish: last
        ? { keepEventIds: args.finish.keepEventIds, syncToken: args.finish.syncToken }
        : null,
      ownerId: args.ownerId,
      todayJst: args.todayJst,
    });
  }
}

function chunk<T>(items: readonly T[], size: number): (readonly T[])[] {
  if (items.length === 0) {
    return [[]];
  }
  const chunks: (readonly T[])[] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
