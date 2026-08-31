import { Result } from "better-result";
import type { FunctionReturnType } from "convex/server";
import * as v from "valibot";

import type { api } from "~/../convex/_generated/api";
import { ValidationFailedError } from "~/lib/errors";
import type { CategoryId } from "~/types/category";

export type ItemDto = FunctionReturnType<typeof api.queries.items.list.list>[number];
export type PresetDto = FunctionReturnType<typeof api.queries.presets.list.list>[number];
export type ItemId = ItemDto["_id"];
export type PresetId = PresetDto["_id"];

const itemIdSchema = v.pipe(v.string(), v.nonEmpty("項目を選んでください"));
const categoryIdSchema = v.pipe(v.string(), v.nonEmpty("カテゴリーを選んでください"));
const presetIdSchema = v.pipe(v.string(), v.nonEmpty("プリセットを選んでください"));

function parseId<T>(
  schema: v.GenericSchema<string, string>,
  value: string,
  emptyMessage: string,
): Result<T, ValidationFailedError> {
  const parsed = v.safeParse(schema, value);
  if (!parsed.success) {
    const [issue] = parsed.issues;
    return Result.err(new ValidationFailedError({ message: issue?.message ?? emptyMessage }));
  }
  return Result.ok(parsed.output as T);
}

export function parseItemId(itemId: string): Result<ItemId, ValidationFailedError> {
  return parseId(itemIdSchema, itemId, "項目を選んでください");
}

export function parseCategoryId(categoryId: string): Result<CategoryId, ValidationFailedError> {
  return parseId(categoryIdSchema, categoryId, "カテゴリーを選んでください");
}

export function parsePresetId(presetId: string): Result<PresetId, ValidationFailedError> {
  return parseId(presetIdSchema, presetId, "プリセットを選んでください");
}

export function unwrapItemId(result: Result<ItemId, ValidationFailedError>): ItemId {
  if (Result.isError(result)) {
    throw result.error;
  }
  return result.value;
}

export function unwrapCategoryId(result: Result<CategoryId, ValidationFailedError>): CategoryId {
  if (Result.isError(result)) {
    throw result.error;
  }
  return result.value;
}

export function unwrapPresetId(result: Result<PresetId, ValidationFailedError>): PresetId {
  if (Result.isError(result)) {
    throw result.error;
  }
  return result.value;
}
