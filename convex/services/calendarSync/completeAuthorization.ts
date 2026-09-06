import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { OwnerSyncOutcome } from "../../lib/validators";
import { changeOutput } from "./changeOutput";
import { connect as connectCalendar } from "./connect";
import { withCalendarOperation } from "./operation";

export async function completeAuthorization(
  ctx: ActionCtx,
  ownerId: string,
  requestId: Id<"calendarAuthorizationRequests">,
): Promise<OwnerSyncOutcome | "moving"> {
  const operation = await withCalendarOperation(
    ctx,
    ownerId,
    async (): Promise<OwnerSyncOutcome | "moving"> => {
      const authorization = await ctx.runMutation(internal.mutations.calendarAuth.consume.consume, {
        ownerId: ownerId,
        requestId: requestId,
      });
      const outcome = await connectCalendar(ctx, ownerId, authorization.googleAccountId);
      if (outcome !== "ok" || authorization.purpose !== "write" || !authorization.calendarId) {
        return outcome;
      }
      const connectionId = await ctx.runQuery(
        internal.queries.calendarSync.byGoogleAccount.byGoogleAccount,
        { ownerId: ownerId, googleAccountId: authorization.googleAccountId },
      );
      if (connectionId === null) {
        throwDomain(
          new NotFoundError({
            message: "接続した Google アカウントを確認できません。連携をやり直してください。",
            resource: "Google カレンダー接続",
          }),
        );
      }
      return changeOutput(ctx, {
        ownerId: ownerId,
        connectionId,
        calendarId: authorization.calendarId,
      });
    },
  );
  return operation.acquired ? operation.value : "busy";
}
