import { use } from "react";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useEnsureCatalog() {
  const ensure = useConvexMutation(api.catalog.ensure);
  use(ensure.mutateAsync({}));
}
