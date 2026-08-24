import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  CHECKPOINT_DEADLINE_REQUIRED_MESSAGE,
  CHECKPOINT_PARENT_KIND_MESSAGE,
  CHECKPOINT_PARENT_REQUIRED_MESSAGE,
  CHECKPOINT_PARENT_SELF_MESSAGE,
} from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { requireOwnedGoal } from "./requireOwnedGoal";

export type MasteryGoalInput = Extract<GoalInput, Record<"type", "mastery">>;

//* 期限つき習得(チェックポイント)の親の不変条件。INV-1〜4 をここ1箇所に集める。
//? 親は requireOwnedGoal で引くので、他人の目標を親に指定すると NotFound で落ちる(INV-2 = IDOR 防止)。
export async function assertCheckpointParent(
  ctx: MutationCtx,
  ownerId: string,
  input: MasteryGoalInput,
  selfId?: Id<"goals">,
): Promise<null> {
  const { deadline, parentGoalId } = input;
  if (deadline === undefined) {
    //? 親だけを持つ状態は保存しない(INV-1)。期限を外すときは親も一緒に落ちる。
    if (parentGoalId !== undefined) {
      throwDomain(new ValidationFailedError({ message: CHECKPOINT_DEADLINE_REQUIRED_MESSAGE }));
    }
    return null;
  }
  if (parentGoalId === undefined) {
    throwDomain(new ValidationFailedError({ message: CHECKPOINT_PARENT_REQUIRED_MESSAGE }));
  }
  //? 自己参照(INV-3)。requireOwnedGoal より先に見て、親の種別より自分自身を優先して知らせる。
  if (selfId !== undefined && parentGoalId === selfId) {
    throwDomain(new ValidationFailedError({ message: CHECKPOINT_PARENT_SELF_MESSAGE }));
  }
  const parent = await requireOwnedGoal(ctx, ownerId, parentGoalId);
  //? 親は本番目標か長期目標だけ。チェックポイントを親にするとチェーンになる(INV-4)。
  if (parent.type === "mastery" && parent.deadline !== undefined) {
    throwDomain(new ValidationFailedError({ message: CHECKPOINT_PARENT_KIND_MESSAGE }));
  }
  return null;
}
