import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { MethodCatalogBoard } from "~/features/methods/components/method-catalog-board";
import { MethodCatalogPending } from "~/features/methods/components/method-catalog-pending";
import { methodCatalogQuery } from "~/features/methods/hooks/method-catalog-queries";
import { useOptionalMethodCatalogLiveQuery } from "~/lib/tanstack-db/collections";

export function MethodCatalogSection() {
  return (
    <Suspense fallback={<MethodCatalogPending />}>
      <MethodCatalogReady />
    </Suspense>
  );
}

function MethodCatalogReady() {
  const liveCatalog = useOptionalMethodCatalogLiveQuery();
  const { data: queriedCatalog } = useSuspenseQuery(methodCatalogQuery());
  const catalog =
    liveCatalog.isReady && liveCatalog.data !== undefined ? liveCatalog.data : queriedCatalog;
  return <MethodCatalogBoard catalog={catalog} />;
}
