import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
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
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "プリセット名は必須です" }));
  }
  if (args.weekday < 0 || args.weekday > 6) {
    throwDomain(new ValidationFailedError({ message: "曜日が不正です" }));
  }
  //? rows/confirm.ts と同じく trim 後の内容を検証し、検証した値をそのまま保存する
  const lines = args.lines.map((line) => ({ ...line, content: line.content.trim() }));
  await assertWeekdayFree(ctx, ownerId, args.weekday);
  await assertOwnedLines(ctx, ownerId, lines);
  return await ctx.db.insert("presets", {
    lines,
    name,
    ownerId,
    weekday: args.weekday,
  });
}
