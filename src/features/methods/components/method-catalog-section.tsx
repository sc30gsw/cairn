import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { MethodCatalogBoard } from "~/features/methods/components/method-catalog-board";
import { MethodCatalogPending } from "~/features/methods/components/method-catalog-pending";
import { methodCatalogQuery } from "~/features/methods/hooks/method-catalog-queries";

//* /goals の下段に置く方法カタログ(8番目のナビタブは作らない — CONTEXT「方法カタログ」)。
//* 自前の Suspense 境界を持つ自己完結セクションなので、route が目標ボードの下に並べるだけでよい。
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
