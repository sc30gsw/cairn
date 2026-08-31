import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { isWeekday, type Weekday } from "../../lib/catalog";
import { requireValidMinutes } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { assertOwnedLines, assertWeekdayFree } from "./helpers";

export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    lines: { content: string; itemId: Id<"items">; minutes: number }[];
    name: string;
    weekday: Weekday;
  },
): Promise<Id<"presets">> {
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "プリセット名は必須です" }));
  }
  if (!isWeekday(args.weekday)) {
    throwDomain(new ValidationFailedError({ message: "曜日が不正です" }));
  }
  const lines = args.lines.map((line) => ({
    ...line,
    content: line.content.trim(),
    minutes: requireValidMinutes(line.minutes),
  }));
  await assertWeekdayFree(ctx, ownerId, args.weekday);
  await assertOwnedLines(ctx, ownerId, lines);
  return await ctx.db.insert("presets", {
    lines,
    name,
    ownerId,
    weekday: args.weekday,
  });
}
