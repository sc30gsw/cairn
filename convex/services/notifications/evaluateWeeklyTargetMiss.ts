import type { MutationCtx } from "../../_generated/server";
import { mondayOfWeek } from "../../lib/jst";
import type { NotificationPayload } from "../../lib/validators";
import { listWithProgress } from "../targets/listWithProgress";

export async function evaluateWeeklyTargetMiss(
  ctx: MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<NotificationPayload | null> {
  const weekStartJst = mondayOfWeek(dateJst);
  const targets = await listWithProgress(ctx, ownerId, { weekStartJst });
  if (targets.length === 0) {
    return null;
  }
  const shortfalls = targets.flatMap((target) =>
    target.achieved
      ? []
      : [
          {
            categoryName: target.categoryName,
            current: target.current,
            metric: target.metric,
            targetValue: target.targetValue,
          },
        ],
  );
  if (shortfalls.length === 0) {
    return null;
  }
  return { kind: "weeklyTargetMiss", shortfalls, weekStartJst };
}
