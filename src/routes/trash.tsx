import { convexQuery } from "@convex-dev/react-query";
import { Loader } from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { api } from "~/../convex/_generated/api";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { TrashList } from "~/features/trash/components/trash-list";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export const Route = createFileRoute("/trash")({
  component: TrashRoute,
});

function TrashRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<Loader aria-label="読み込み中" />}>
        <TrashReady />
      </Suspense>
    </OwnerGate>
  );
}

function TrashReady() {
  const { data: trash } = useSuspenseQuery(convexQuery(api.trash.list, {}));
  const restoreDay = useConvexMutation(api.trash.restoreDay);
  const restoreRow = useConvexMutation(api.rows.restore);

  return (
    <TrashList
      onRestoreDay={(dayId) => {
        void restoreDay.mutateAsync({ dayId });
      }}
      onRestoreRow={(rowId) => {
        void restoreRow.mutateAsync({ rowId });
      }}
      trash={trash}
    />
  );
}
