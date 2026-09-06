import { Result } from "better-result";
import { customAction, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { ConvexError } from "convex/values";

import { action, mutation, query, type QueryCtx } from "../_generated/server";
import type { DomainError } from "./errors";
import { ownerFromIdentity } from "./owner";

export function throwDomain(error: DomainError): never {
  throw new ConvexError({ message: error.message, tag: error._tag });
}

async function ownerCtx(ctx: Pick<QueryCtx, "auth">) {
  const identity = await ctx.auth.getUserIdentity();
  const result = ownerFromIdentity(
    identity === null ? null : { email: identity.email, subject: identity.subject },
  );
  if (Result.isError(result)) {
    throwDomain(result.error);
  }
  return result.value.ownerId;
}

export const ownerQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    return { args: {}, ctx: { ...ctx, ownerId: await ownerCtx(ctx) } };
  },
});

export const ownerMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    return { args: {}, ctx: { ...ctx, ownerId: await ownerCtx(ctx) } };
  },
});

export const ownerAction = customAction(action, {
  args: {},
  input: async (ctx) => {
    return { args: {}, ctx: { ...ctx, ownerId: await ownerCtx(ctx) } };
  },
});
