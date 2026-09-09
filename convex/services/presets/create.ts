import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireValidMinutes } from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { PresetWeekdayInput } from "../../lib/validators";
import { assertOwnedLines, assertWeekdaysFree, resolvePresetWeekdays } from "./helpers";

export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: PresetWeekdayInput & {
    lines: { content: string; itemId: Id<"items">; minutes: number }[];
    name: string;
  },
): Promise<Id<"presets">> {
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "プリセット名は必須です" }));
  }
  const weekdays = resolvePresetWeekdays(args);
  const lines = args.lines.map((line) => ({
    ...line,
    content: line.content.trim(),
    minutes: requireValidMinutes(line.minutes),
  }));
  await assertWeekdaysFree(ctx, ownerId, weekdays);
  await assertOwnedLines(ctx, ownerId, lines);
  return await ctx.db.insert("presets", {
    lines,
    name,
    ownerId,
    weekdays,
  });
}
