import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  normalizePresetWeekdays,
  presetUsesWeekday,
  type PresetWeekdayFields,
  type Weekday,
} from "../../lib/catalog";
import { ConflictError, NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { PresetWeekdayInput } from "../../lib/validators";

export async function assertOwnedLines(
  ctx: MutationCtx,
  ownerId: string,
  lines: { itemId: Id<"items"> }[],
) {
  await Promise.all(
    lines.map(async (line) => {
      const item = await ctx.db.get("items", line.itemId);
      if (item === null || item.ownerId !== ownerId) {
        throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
      }
    }),
  );
}

export function validateAndSortWeekdays(weekdays: readonly Weekday[]): Weekday[] {
  if (weekdays.length === 0) {
    throwDomain(new ValidationFailedError({ message: "曜日を1つ以上選んでください" }));
  }
  const uniqueWeekdays = [...new Set(weekdays)].toSorted((left, right) => left - right);
  if (uniqueWeekdays.length !== weekdays.length) {
    throwDomain(new ValidationFailedError({ message: "同じ曜日を重複して選べません" }));
  }
  return uniqueWeekdays;
}

export function resolvePresetWeekdays(input: PresetWeekdayInput): Weekday[] {
  if (input.weekday !== undefined && input.weekdays !== undefined) {
    throwDomain(new ValidationFailedError({ message: "曜日の指定方法が重複しています" }));
  }
  return validateAndSortWeekdays(
    input.weekdays ?? (input.weekday === undefined ? [] : [input.weekday]),
  );
}

export function findUniquePresetForWeekday<T extends PresetWeekdayFields>(
  presets: readonly T[],
  weekday: Weekday,
): T | undefined {
  const matches = presets.filter((preset) => presetUsesWeekday(preset, weekday));
  if (matches.length > 1) {
    throwDomain(new ConflictError({ message: "各曜日はプリセット1つだけです" }));
  }
  return matches[0];
}

export async function assertWeekdaysFree(
  ctx: MutationCtx,
  ownerId: string,
  weekdays: readonly Weekday[],
  ignoreId?: Id<"presets">,
) {
  const existing = await ctx.db
    .query("presets")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const selected = new Set(weekdays);
  const hasConflict = existing.some(
    (preset) =>
      preset._id !== ignoreId &&
      normalizePresetWeekdays(preset).some((weekday) => selected.has(weekday)),
  );
  if (hasConflict) {
    throwDomain(new ConflictError({ message: "各曜日はプリセット1つだけです" }));
  }
}
