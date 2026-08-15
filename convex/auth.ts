import { createClient } from "@convex-dev/better-auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { isActionCtx, isQueryCtx } from "@convex-dev/better-auth/utils";
import { APIError } from "better-auth/api";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { requireEnv } from "./lib/env";

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  local: { schema: authSchema },
});

const isLiveConvexCtx = (ctx: GenericCtx<DataModel>) => isQueryCtx(ctx) || isActionCtx(ctx);

type AdapterPage = {
  page: unknown[];
};

async function ownerUserExists(ctx: GenericCtx<DataModel>): Promise<boolean> {
  //? HTTP 以外（CLI の staticAuth）ではユーザー表を引けないので、signup は閉じたままにする。
  if (!("runQuery" in ctx)) {
    return true;
  }
  const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "user",
    paginationOpts: { cursor: null, numItems: 1 },
  })) as AdapterPage;
  return result.page.length > 0;
}

export const createAuthOptions = (ctx: GenericCtx<DataModel>, disableSignUp = true) => {
  const siteUrl = process.env.SITE_URL;
  return {
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (user.email !== requireEnv("ALLOWED_EMAIL")) {
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
        clientId: process.env.NOTION_CLIENT_ID as string,
        clientSecret: process.env.NOTION_CLIENT_SECRET as string,
        disableSignUp,
      },
    },
    trustedOrigins: siteUrl === undefined ? [] : [siteUrl],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  if (isLiveConvexCtx(ctx)) {
    requireEnv("ALLOWED_EMAIL");
    requireEnv("BETTER_AUTH_SECRET");
    requireEnv("NOTION_CLIENT_ID");
    requireEnv("NOTION_CLIENT_SECRET");
    requireEnv("SITE_URL");
  }
  const auth = betterAuth(createAuthOptions(ctx, true));
  if (!("runQuery" in ctx)) {
    return auth;
  }
  return Object.assign(auth, {
    handler: async (request: Request) => {
      const exists = await ownerUserExists(ctx);
      return betterAuth(createAuthOptions(ctx, exists)).handler(request);
    },
  });
};
