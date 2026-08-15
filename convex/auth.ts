import { createClient } from "@convex-dev/better-auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { APIError } from "better-auth/api";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { requireEnv } from "./lib/env";

const siteUrl = requireEnv("SITE_URL");

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  local: { schema: authSchema },
});

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (user.email !== process.env.ALLOWED_EMAIL) {
              throw new APIError("FORBIDDEN", {
                message: "許可されていないアカウントです",
              });
            }
          },
        },
      },
    },
    plugins: [convex({ authConfig })],
    socialProviders: {
      notion: {
        clientId: requireEnv("NOTION_CLIENT_ID"),
        clientSecret: requireEnv("NOTION_CLIENT_SECRET"),
      },
    },
    trustedOrigins: [siteUrl],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
