import { useEffect } from "react";

import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function useEnsureCatalog() {
  const ensure = useConvexMutation(api.catalog.ensure);
  const ensureCatalog = ensure.mutateAsync;
  useEffect(() => {
    void ensureCatalog({});
  }, [ensureCatalog]);
}
