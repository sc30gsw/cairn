import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { assertConcreteActionLines } from "../../lib/concreteAction";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { assertOwnedLines, assertWeekdayFree } from "./helpers";

export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    lines: { content: string; itemId: Id<"items">; minutes: number }[];
    name: string;
    weekday: number;
  },
): Promise<Id<"presets">> {
  if (args.weekday < 0 || args.weekday > 6) {
    throwDomain(new ValidationFailedError({ message: "曜日が不正です" }));
  }
  await assertWeekdayFree(ctx, ownerId, args.weekday);
  await assertOwnedLines(ctx, ownerId, args.lines);
  assertConcreteActionLines(args.lines);
  return await ctx.db.insert("presets", {
    lines: args.lines,
    name: args.name,
    ownerId,
    weekday: args.weekday,
  });
}
