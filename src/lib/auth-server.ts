import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";
import { requireEnv } from "~domain/env";

const auth = convexBetterAuthReactStart({
  convexSiteUrl: requireEnv("VITE_CONVEX_SITE_URL"),
  convexUrl: requireEnv("VITE_CONVEX_URL"),
});

export const { getToken, handler } = auth;
