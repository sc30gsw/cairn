import { createClient } from "@convex-dev/better-auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { isActionCtx, isQueryCtx } from "@convex-dev/better-auth/utils";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { username } from "better-auth/plugins";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { notionOAuthConfigured, requireEnv } from "./lib/env";

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  local: { schema: authSchema },
});

const isLiveConvexCtx = (ctx: GenericCtx<DataModel>) => isQueryCtx(ctx) || isActionCtx(ctx);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = process.env.SITE_URL;
  const notionAuth = notionOAuthConfigured();
  return {
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [convex({ authConfig }), username()],
    socialProviders: notionAuth
      ? {
          notion: {
            clientId: process.env.NOTION_CLIENT_ID ?? "",
            clientSecret: process.env.NOTION_CLIENT_SECRET ?? "",
          },
        }
      : undefined,
    trustedOrigins: siteUrl === undefined ? [] : [siteUrl],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  if (isLiveConvexCtx(ctx)) {
    requireEnv("BETTER_AUTH_SECRET");
    requireEnv("SITE_URL");
  }
  return betterAuth(createAuthOptions(ctx));
};
