import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import type { PulledEvent } from "../../lib/validators";

const APPLY_CHUNK_SIZE = 200;

type ApplyPulledEventsArgs = {
  generation?: number;
  connectionId?: Id<"calendarConnections">;
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
  const pullId = args.connectionId === undefined ? undefined : crypto.randomUUID();
  const batches = chunk(args.events, chunkSize);
  for (const [index, events] of batches.entries()) {
    const last = index === batches.length - 1;
    // oxlint-disable-next-line react-doctor/async-await-in-loop
    await ctx.runMutation(internal.mutations.calendarSync.applyPull.applyPull, {
      calendarId: args.calendarId,
      connectionId: args.connectionId,
      generation: args.generation,
      events: [...events],
      pullId,
      finish:
        last && pullId === undefined
          ? { keepEventIds: args.finish.keepEventIds, syncToken: args.finish.syncToken }
          : null,
      ownerId: args.ownerId,
      todayJst: args.todayJst,
    });
  }
  if (args.connectionId !== undefined && pullId !== undefined) {
    let cursor: string | null = null;
    do {
      cursor = await ctx.runMutation(
        internal.mutations.calendarSync.finishPullPage.finishPullPage,
        {
          ownerId: args.ownerId,
          connectionId: args.connectionId,
          calendarId: args.calendarId,
          pullId,
          full: args.finish.keepEventIds !== null,
          todayJst: args.todayJst,
          syncToken: args.finish.syncToken,
          cursor,
        },
      );
    } while (cursor !== null);
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
