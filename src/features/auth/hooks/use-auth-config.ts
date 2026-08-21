import { useQuery } from "@tanstack/react-query";

import { authPublicConfigQueryOptions } from "~/features/auth/api/auth-queries";

export function useAuthPublicConfig() {
  return useQuery(authPublicConfigQueryOptions());
}
