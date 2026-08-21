import { convexQuery } from "@convex-dev/react-query";

import { api } from "~/../convex/_generated/api";

export function authPublicConfigQueryOptions() {
  return convexQuery(api.queries.auth.publicConfig.publicConfig, {});
}
