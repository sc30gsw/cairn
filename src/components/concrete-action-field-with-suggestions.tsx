import { Shimmer } from "@shimmer-from-structure/react";
import { Suspense } from "react";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  ConcreteActionField,
  type ConcreteActionFieldProps,
} from "~/components/concrete-action-field";
import { useRecentConcreteActions } from "~/hooks/use-recent-concrete-actions";

type ConcreteActionFieldWithSuggestionsProps = ConcreteActionFieldProps & {
  itemId: Id<"items">;
};

function SuggestingField({ itemId, ...props }: ConcreteActionFieldWithSuggestionsProps) {
  const { data: suggestions } = useRecentConcreteActions({ itemId });
  return <ConcreteActionField {...props} suggestions={suggestions} />;
}

//? フォールバックは suggestions なしの同フィールド。suspend する内側コンポーネントを描画しない(shimmer-from-structure.md パターン2)
export function ConcreteActionFieldWithSuggestions({
  itemId,
  ...props
}: ConcreteActionFieldWithSuggestionsProps) {
  return (
    <Suspense
      fallback={
        <Shimmer loading>
          <ConcreteActionField {...props} />
        </Shimmer>
      }
    >
      <SuggestingField itemId={itemId} {...props} />
    </Suspense>
  );
}
