import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { ConflictError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function withCalendarOperation<T>(
  ctx: ActionCtx,
  ownerId: string,
  operation: () => Promise<T>,
  connectionId?: Id<"calendarConnections">,
): Promise<{ acquired: false } | { acquired: true; value: T }> {
  const operationId = await ctx.runMutation(
    internal.mutations.calendarSync.acquireOperation.acquireOperation,
    {
      ownerId,
      connectionId,
    },
  );
  if (operationId === null) return { acquired: false };
  try {
    return { acquired: true, value: await operation() };
  } finally {
    await ctx.runMutation(internal.mutations.calendarSync.releaseOperation.releaseOperation, {
      operationId,
    });
  }
}

export async function requireCalendarOperation<T>(
  ctx: ActionCtx,
  ownerId: string,
  operation: () => Promise<T>,
  connectionId?: Id<"calendarConnections">,
): Promise<T> {
  const result = await withCalendarOperation(ctx, ownerId, operation, connectionId);
  if (!result.acquired) {
    throwDomain(
      new ConflictError({ message: "カレンダーを同期中です。少し待ってから再試行してください" }),
    );
  }
  return result.value;
}
