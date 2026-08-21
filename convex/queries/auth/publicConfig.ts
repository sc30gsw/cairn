import { v } from "convex/values";

import { query } from "../../_generated/server";
import { notionOAuthConfigured, signUpDisabledFromEnv } from "../../lib/env";

export const publicConfig = query({
  args: {},
  returns: v.object({
    notionSignIn: v.boolean(),
    signUpEnabled: v.boolean(),
  }),
  handler: async () => ({
    notionSignIn: notionOAuthConfigured(),
    signUpEnabled: !signUpDisabledFromEnv(),
  }),
});
