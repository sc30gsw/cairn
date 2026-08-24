import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { dueFixedTriggers, nowJst } from "../../lib/notifications";
import { emitNotification } from "./emitNotification";
import { evaluateCheckpointDeadline } from "./evaluateCheckpointDeadline";
import { evaluateEveningUntouched } from "./evaluateEveningUntouched";
import { evaluateWeeklyTargetMiss } from "./evaluateWeeklyTargetMiss";
import { loadDueSettings } from "./loadDueSettings";

type FixedDue = ReturnType<typeof dueFixedTriggers>;

//? 1所有者ぶんの評価。3トリガーは互いに独立なので同時に測り、作る通知だけ emit する。
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
  //? dedupeKey が種類ごとに違うので、同時に emit しても互いを潰さない。
  await Promise.all(
    payloads.map(async (payload) => {
      if (payload !== null) {
        await emitNotification(ctx, setting, payload, now);
      }
    }),
  );
}

//* 評価の司令塔。毎時0分の cron から1本だけ走る。時計はここで1回読み、以降はその値を配る。
//? 3トリガーの「いま発火すべきか」は JST の暦日・時・曜日から純関数で決める(UTC 換算を埋めない)。
export async function evaluate(ctx: MutationCtx, args: { now?: number } = {}): Promise<null> {
  //? mutation なので時計を読んでよい(CVX-14)。
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
