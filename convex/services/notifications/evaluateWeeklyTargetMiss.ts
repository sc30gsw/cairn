import type { MutationCtx } from "../../_generated/server";
import { mondayOfWeek } from "../../lib/jst";
import type { NotificationPayload } from "../../lib/validators";
import { listWithProgress } from "../targets/listWithProgress";

//* 週間ターゲット未達。画面が見せている数字と同じ関数(listWithProgress)から出す。
//? ターゲット0件では発火しない(設定の不足はセットアップの担当)。全件達成でも発火しない — 祝わない。
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
  //? remaining は保存しない(引き算はいつでも同じ答えになる)。文言側で引く。
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
