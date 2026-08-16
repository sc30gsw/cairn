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
  if (args.weekday < 0 || args.weekday > 6) {
    throwDomain(new ValidationFailedError({ message: "曜日が不正です" }));
  }
  await assertWeekdayFree(ctx, ownerId, args.weekday, args.presetId);
  await assertOwnedLines(ctx, ownerId, args.lines);
  assertConcreteActionLines(args.lines);
  await ctx.db.patch("presets", args.presetId, {
    lines: args.lines,
    name: args.name,
    weekday: args.weekday,
  });
  return null;
}
