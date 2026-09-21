import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { applyForgottenToNewDays as applyForgotten } from "../../services/plan/templates";

export const applyForgottenToNewDays = internalMutation({
  args: {},
  handler: async (ctx) => applyForgotten(ctx),
  returns: v.null(),
});
