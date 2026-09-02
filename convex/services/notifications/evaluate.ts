import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { dueFixedTriggers, nowJst } from "../../lib/notifications";
import { emitNotification } from "./emitNotification";
import { evaluateCheckpointDeadline } from "./evaluateCheckpointDeadline";
import { evaluateEveningUntouched } from "./evaluateEveningUntouched";
import { evaluateWeeklyTargetMiss } from "./evaluateWeeklyTargetMiss";
import { loadDueSettings } from "./loadDueSettings";

type FixedDue = ReturnType<typeof dueFixedTriggers>;

async function evaluateOwner(
  ctx: MutationCtx,
  setting: Doc<"notificationSettings">,
  args: { dateJst: string; due: FixedDue; hour: number; now: number },
): Promise<void> {
  const { dateJst, due, hour, now } = args;
  const payloads = await Promise.all([
    due.checkpointDeadline && setting.triggers.checkpointDeadline
      ? evaluateCheckpointDeadline(ctx, setting.ownerId, dateJst)
      : null,
    due.weeklyTargetMiss && setting.triggers.weeklyTargetMiss
      ? evaluateWeeklyTargetMiss(ctx, setting.ownerId, dateJst)
      : null,
    hour === setting.eveningHourJst && setting.triggers.eveningUntouched
      ? evaluateEveningUntouched(ctx, setting.ownerId, dateJst)
      : null,
  ]);
  await Promise.all(
    payloads.map(async (payload) => {
      if (payload !== null) {
        await emitNotification(ctx, setting, payload, now);
      }
    }),
  );
}

export async function evaluate(ctx: MutationCtx, args: { now?: number } = {}): Promise<null> {
  const now = args.now ?? Date.now();
  const { dateJst, hourJst: hour } = nowJst(now);
  const due = dueFixedTriggers(dateJst, hour);
  const settings = await loadDueSettings(ctx, {
    fixedDue: due.checkpointDeadline || due.weeklyTargetMiss,
    hour,
  });
  await Promise.all(
    settings.map((setting) => evaluateOwner(ctx, setting, { dateJst, due, hour, now })),
  );
  return null;
}
