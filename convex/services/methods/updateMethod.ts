import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { requireOwnedMethod } from "./helpers";

export async function updateMethod(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    bodyText: string;
    completionHtml: string;
    memoHtml: string;
    methodId: Id<"methods">;
    name: string;
  },
): Promise<null> {
  await requireOwnedMethod(ctx, ownerId, args.methodId);
  const name = args.name.trim();
  if (name === "") {
    throwDomain(new ValidationFailedError({ message: "方法のタイトルは必須です" }));
  }
  await ctx.db.patch("methods", args.methodId, {
    bodyText: args.bodyText,
    completionHtml: args.completionHtml,
    memoHtml: args.memoHtml,
    name,
  });
  return null;
}
