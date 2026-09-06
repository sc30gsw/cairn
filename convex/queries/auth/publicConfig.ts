import { v } from "convex/values";

import { query } from "../../_generated/server";
import { googleOAuthConfigured, signUpDisabledFromEnv } from "../../lib/env";

export const publicConfig = query({
  args: {},
  returns: v.object({
    googleSignIn: v.boolean(),
    signUpEnabled: v.boolean(),
  }),
  handler: async () => ({
    googleSignIn: googleOAuthConfigured(),
    signUpEnabled: !signUpDisabledFromEnv(),
  }),
});
