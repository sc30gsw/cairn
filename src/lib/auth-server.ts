import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

export const { fetchAuthAction, fetchAuthMutation, fetchAuthQuery, getToken, handler } =
  convexBetterAuthReactStart({
    convexSiteUrl: process.env.VITE_CONVEX_SITE_URL ?? "",
    convexUrl: process.env.VITE_CONVEX_URL ?? "",
  });
