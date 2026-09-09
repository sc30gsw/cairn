import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireValidMinutes } from "../../lib/domain";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { PresetWeekdayInput } from "../../lib/validators";
import { assertOwnedLines, assertWeekdaysFree, resolvePresetWeekdays } from "./helpers";

export async function update(
  ctx: MutationCtx,
  ownerId: string,
  args: PresetWeekdayInput & {
    lines: { content: string; itemId: Id<"items">; minutes: number }[];
    name: string;
    presetId: Id<"presets">;
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
  const weekdays = resolvePresetWeekdays(args);
  const lines = args.lines.map((line) => ({
    ...line,
    content: line.content.trim(),
    minutes: requireValidMinutes(line.minutes),
  }));
  await assertWeekdaysFree(ctx, ownerId, weekdays, args.presetId);
  await assertOwnedLines(ctx, ownerId, lines);
  await ctx.db.patch("presets", args.presetId, {
    lines,
    name,
    weekday: undefined,
    weekdays,
  });
  return null;
}
