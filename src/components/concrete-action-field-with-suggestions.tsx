import { Shimmer } from "@shimmer-from-structure/react";
import { Suspense } from "react";

import type { Id } from "~/../convex/_generated/dataModel";
import {
  ConcreteActionField,
  type ConcreteActionFieldProps,
} from "~/components/concrete-action-field";
import { useRecentConcreteActions } from "~/hooks/use-recent-concrete-actions";
import { isShimmerId } from "~/lib/shimmer-id";

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
  //? shimmer テンプレートの疑似 id は v.id("items") を満たさないため、問い合わせず候補なしで描画する
  if (isShimmerId(itemId)) {
    return <ConcreteActionField {...props} />;
  }

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
