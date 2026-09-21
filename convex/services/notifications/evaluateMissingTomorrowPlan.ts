import type { MutationCtx } from "../../_generated/server";
import { addDaysJst } from "../../lib/jst";
import type { NotificationPayload } from "../../lib/validators";
import { eventsOnDate } from "../plan/events";

export async function evaluateMissingTomorrowPlan(
  ctx: MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<NotificationPayload | null> {
  const tomorrowJst = addDaysJst(dateJst, 1);
  const events = await eventsOnDate(ctx, ownerId, tomorrowJst);
  if (events.length > 0) {
    return null;
  }
  return { dateJst: tomorrowJst, kind: "missingTomorrowPlan" };
}
