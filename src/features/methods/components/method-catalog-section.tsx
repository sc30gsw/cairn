import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { MethodCatalogBoard } from "~/features/methods/components/method-catalog-board";
import { MethodCatalogPending } from "~/features/methods/components/method-catalog-pending";
import { methodCatalogQuery } from "~/features/methods/hooks/method-catalog-queries";

export function MethodCatalogSection() {
  return (
    <Suspense fallback={<MethodCatalogPending />}>
      <MethodCatalogReady />
    </Suspense>
  );
}

function MethodCatalogReady() {
  const { data } = useSuspenseQuery(methodCatalogQuery());
  return <MethodCatalogBoard catalog={data} />;
}
