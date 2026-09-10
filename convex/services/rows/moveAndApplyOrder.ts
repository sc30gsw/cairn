import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { timerMinutes } from "../../lib/rowTimer";
import type { MoveAndApplyOrderArgs } from "../../lib/validators/rowMove";
import { applyOrder } from "./applyOrder";
import { confirm } from "./confirm";
import { reopen } from "./reopen";
import { requireOwnedRow } from "./requireOwnedRow";
import { skip } from "./skip";
import { start } from "./start";
import { stopTimer } from "./stopTimer";
import { unconfirm } from "./unconfirm";
import { unskip } from "./unskip";
import { unstart } from "./unstart";

export async function moveAndApplyOrder(
  ctx: MutationCtx,
  ownerId: string,
  args: MoveAndApplyOrderArgs,
): Promise<number | null> {
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  if (row.dateJst !== args.dateJst) {
    throwDomain(new ValidationFailedError({ message: "記録の日付が一致しません" }));
  }
  let confirmedMinutes: number | null = null;
  switch (args.move) {
    case "confirm": {
      if (args.content === undefined) {
        throwDomain(new ValidationFailedError({ message: "確定内容が必要です" }));
      }
      const minutes =
        args.minutes ?? timerMinutes(await stopTimer(ctx, ownerId, { rowId: args.rowId }));
      confirmedMinutes = minutes;
      await confirm(ctx, ownerId, { content: args.content, minutes, rowId: args.rowId });
      break;
    }
    case "reopen":
      await reopen(ctx, ownerId, { rowId: args.rowId });
      break;
    case "skip":
      await skip(ctx, ownerId, { rowId: args.rowId });
      break;
    case "start":
      await start(ctx, ownerId, { rowId: args.rowId });
      break;
    case "unconfirm":
      await unconfirm(ctx, ownerId, { rowId: args.rowId });
      break;
    case "unskip":
      await unskip(ctx, ownerId, { rowId: args.rowId });
      break;
    case "unstart":
      await unstart(ctx, ownerId, { rowId: args.rowId });
      break;
  }
  await applyOrder(ctx, ownerId, args);
  return confirmedMinutes;
}
