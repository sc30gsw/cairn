import { Result } from "better-result";

import type { MutationCtx } from "../../_generated/server";
import { requireCurrentWeekStartJst } from "../../lib/dateArgs";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { requireGoalItem } from "./requireGoalItem";
import { validateGoalInput } from "./validateGoalInput";

export type GoalWriteArgs = {
  goal: GoalInput;
  weekStartJst: string;
};

//* 作成と更新に共通する前処理。週キー・値制約・項目リンクをまとめて弾き、正規化した週キーを返す。
//? タイプに関わらず引数の形は同じ基準で弾く。ペース以外でも契約を揺らさない。
export async function prepareGoalWrite(
  ctx: MutationCtx,
  ownerId: string,
  args: GoalWriteArgs,
): Promise<string> {
  const weekStartJst = requireCurrentWeekStartJst(args.weekStartJst);
  const validated = validateGoalInput(args.goal);
  if (Result.isError(validated)) {
    throwDomain(validated.error);
  }
  await requireGoalItem(ctx, ownerId, args.goal);
  return weekStartJst;
}
