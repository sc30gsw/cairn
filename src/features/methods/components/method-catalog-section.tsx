import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { MethodCatalogBoard } from "~/features/methods/components/method-catalog-board";
import { MethodCatalogPending } from "~/features/methods/components/method-catalog-pending";
import { methodCatalogQuery } from "~/features/methods/hooks/method-catalog-queries";
import {
  useOptionalMethodLanesLiveQuery,
  useOptionalMethodsWithLanesLiveQuery,
} from "~/lib/tanstack-db/collections";

export function MethodCatalogSection() {
  return (
    <Suspense fallback={<MethodCatalogPending />}>
      <MethodCatalogReady />
    </Suspense>
  );
}

function MethodCatalogReady() {
  const { data: queriedCatalog } = useSuspenseQuery(methodCatalogQuery());
  const liveLanes = useOptionalMethodLanesLiveQuery();
  const liveMethodsWithLanes = useOptionalMethodsWithLanesLiveQuery();
  const joinedMethods =
    liveMethodsWithLanes.isReady && liveMethodsWithLanes.data !== undefined
      ? liveMethodsWithLanes.data.map(({ method }) => method)
      : undefined;
  const catalog =
    joinedMethods === undefined || !liveLanes.isReady || liveLanes.data === undefined
      ? queriedCatalog
      : { lanes: liveLanes.data, methods: joinedMethods };
  return <MethodCatalogBoard catalog={catalog} />;
}
