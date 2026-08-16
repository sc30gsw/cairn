import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { keptRowsAfterSwitch } from "../../lib/preset";
import { throwDomain } from "../../lib/ownerFunctions";
import { getDayByDate } from "../days/getDayByDate";
import { liveRowsForDay } from "../days/liveRowsForDay";
import { requireLiveDay } from "../days/requireLiveDay";

export async function switchPreset(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string; presetId: Id<"presets">; todayJst: string },
): Promise<null> {
  if (args.dateJst !== args.todayJst) {
    throwDomain(new ValidationFailedError({ message: "今日だけ別プリセットに切り替えられます" }));
  }
  const preset = await ctx.db.get("presets", args.presetId);
  if (preset === null || preset.ownerId !== ownerId) {
    throwDomain(
      new NotFoundError({ message: "プリセットが見つかりません", resource: "プリセット" }),
    );
  }
  const existing = await getDayByDate(ctx, ownerId, args.dateJst);
  if (existing !== null && existing.deletedAt !== undefined) {
    throwDomain(
      new NotFoundError({ message: "ゴミ箱の日です。先に戻してください", resource: "日" }),
    );
  }
  const day =
    existing ??
    (preset.lines.length === 0 ? null : await requireLiveDay(ctx, ownerId, args.dateJst));
  if (day === null) {
    throwDomain(new NotFoundError({ message: "今日の日がありません", resource: "日" }));
  }
  const rows = await liveRowsForDay(ctx, day._id);
  const kept = keptRowsAfterSwitch(rows);
  const startOrder = kept.reduce((max, row) => Math.max(max, row.sortOrder), -1);
  await Promise.all(
    rows.flatMap((row) => (row.status === "未着手" ? [ctx.db.delete("rows", row._id)] : [])),
  );
  await Promise.all(
    preset.lines.map((line, index) =>
      ctx.db.insert("rows", {
        content: line.content,
        dateJst: args.dateJst,
        dayId: day._id,
        itemId: line.itemId,
        minutes: line.minutes,
        ownerId,
        sortOrder: startOrder + 1 + index,
        status: "未着手",
      }),
    ),
  );
  return null;
}
