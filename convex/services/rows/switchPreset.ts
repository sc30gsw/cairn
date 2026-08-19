import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { keptRowsAfterSwitch } from "../../lib/preset";
import { liveRowsForDay } from "../days/liveRowsForDay";
import { requireEditableDay } from "../days/requireEditableDay";
import { requireLiveDay } from "../days/requireLiveDay";

export async function switchPreset(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string; presetId: Id<"presets">; todayJst: string },
): Promise<null> {
  const existing = await requireEditableDay(ctx, ownerId, args.dateJst, args.todayJst);
  const preset = await ctx.db.get("presets", args.presetId);
  if (preset === null || preset.ownerId !== ownerId) {
    throwDomain(
      new NotFoundError({ message: "プリセットが見つかりません", resource: "プリセット" }),
    );
  }
  const day =
    existing ??
    (preset.lines.length === 0 ? null : await requireLiveDay(ctx, ownerId, args.dateJst));
  if (day === null) {
    throwDomain(new NotFoundError({ message: "日がありません", resource: "日" }));
  }
  const rows = await liveRowsForDay(ctx, day._id);
  const kept = keptRowsAfterSwitch(rows);
  const startOrder = kept.reduce((max, row) => Math.max(max, row.sortOrder), -1);
  //? 消すのも足すのも未着手だけ。確定は残るので習得目標のカウンタは動かさない(ADR-0007)。
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
