import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { isWeekday, type Weekday } from "../../lib/catalog";
import { requireValidMinutes } from "../../lib/domain";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { assertOwnedLines, assertWeekdayFree } from "./helpers";

export async function update(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    lines: { content: string; itemId: Id<"items">; minutes: number }[];
    name: string;
    presetId: Id<"presets">;
    weekday: Weekday;
  },
): Promise<null> {
  const preset = await ctx.db.get("presets", args.presetId);
  if (preset === null || preset.ownerId !== ownerId) {
    throwDomain(
      new NotFoundError({ message: "プリセットが見つかりません", resource: "プリセット" }),
    );
  }
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "プリセット名は必須です" }));
  }
  if (!isWeekday(args.weekday)) {
    throwDomain(new ValidationFailedError({ message: "曜日が不正です" }));
  }
  //? rows/confirm.ts と同じく trim 後の内容・検証済みの分数だけを保存する
  const lines = args.lines.map((line) => ({
    ...line,
    content: line.content.trim(),
    minutes: requireValidMinutes(line.minutes),
  }));
  await assertWeekdayFree(ctx, ownerId, args.weekday, args.presetId);
  await assertOwnedLines(ctx, ownerId, lines);
  await ctx.db.patch("presets", args.presetId, {
    lines,
    name,
    weekday: args.weekday,
  });
  return null;
}
