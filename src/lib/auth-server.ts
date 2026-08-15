import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { requireEnv } from "~domain/env";

export const { fetchAuthAction, fetchAuthMutation, fetchAuthQuery, getToken, handler } =
  convexBetterAuthReactStart({
    convexSiteUrl: requireEnv("VITE_CONVEX_SITE_URL"),
    convexUrl: requireEnv("VITE_CONVEX_URL"),
  });
