import { Result } from "better-result";
import { customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { ConvexError } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { DomainError } from "./lib/errors";
import { ownerFromIdentity } from "./lib/owner";

export function throwDomain(error: DomainError): never {
  throw new ConvexError({ message: error.message, tag: error._tag });
}

export const ownerQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const result = ownerFromIdentity(
      identity === null ? null : { email: identity.email, subject: identity.subject },
      process.env.ALLOWED_EMAIL,
    );
    if (Result.isError(result)) {
      throwDomain(result.error);
    }
    return { args: {}, ctx: { ...ctx, ownerId: result.value.ownerId } };
  },
});

export const ownerMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const result = ownerFromIdentity(
      identity === null ? null : { email: identity.email, subject: identity.subject },
      process.env.ALLOWED_EMAIL,
    );
    if (Result.isError(result)) {
      throwDomain(result.error);
    }
    return { args: {}, ctx: { ...ctx, ownerId: result.value.ownerId } };
  },
});
