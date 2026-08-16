import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { isFutureDateJst } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";
import { getDayByDate } from "./getDayByDate";

export async function requireEditableDay(
  ctx: MutationCtx,
  ownerId: string,
  dateJst: string,
  todayJst: string,
): Promise<Doc<"days"> | null> {
  if (isFutureDateJst(dateJst, todayJst)) {
    throwDomain(new ValidationFailedError({ message: "未来の日は編集できません" }));
  }
  const existing = await getDayByDate(ctx, ownerId, dateJst);
  if (existing !== null && existing.deletedAt !== undefined) {
    throwDomain(
      new NotFoundError({ message: "ゴミ箱の日です。先に戻してください", resource: "日" }),
    );
  }
  return existing;
}
