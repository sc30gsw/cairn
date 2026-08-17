import type { MutationCtx } from "../../_generated/server";
import { PACE_LIMITS } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { upsertWeekSnapshot, type WeekSnapshotArgs } from "./upsertWeekSnapshot";
import { PACE_DAYS_MESSAGE, PACE_FLOOR_MESSAGE } from "./validateGoalInput";

//* 「この週だけ変える」。ペース目標そのものは動かさない。
export async function saveWeekly(
  ctx: MutationCtx,
  ownerId: string,
  args: WeekSnapshotArgs,
): Promise<null> {
  if (
    !Number.isInteger(args.days) ||
    args.days < PACE_LIMITS.minDays ||
    args.days > PACE_LIMITS.maxDays
  ) {
    throwDomain(new ValidationFailedError({ message: PACE_DAYS_MESSAGE }));
  }
  if (
    !Number.isInteger(args.dailyFloorMinutes) ||
    args.dailyFloorMinutes < PACE_LIMITS.minFloorMinutes
  ) {
    throwDomain(new ValidationFailedError({ message: PACE_FLOOR_MESSAGE }));
  }
  return upsertWeekSnapshot(ctx, ownerId, args);
}
