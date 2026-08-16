import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { assertConcreteActionLines } from "../../lib/concreteAction";
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
    weekday: number;
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
  if (args.weekday < 0 || args.weekday > 6) {
    throwDomain(new ValidationFailedError({ message: "曜日が不正です" }));
  }
  //? rows/confirm.ts と同じく trim 後の内容を検証し、検証した値をそのまま保存する
  const lines = args.lines.map((line) => ({ ...line, content: line.content.trim() }));
  await assertWeekdayFree(ctx, ownerId, args.weekday, args.presetId);
  await assertOwnedLines(ctx, ownerId, lines);
  assertConcreteActionLines(lines);
  await ctx.db.patch("presets", args.presetId, {
    lines,
    name,
    weekday: args.weekday,
  });
  return null;
}
