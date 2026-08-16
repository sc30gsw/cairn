import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { api } from "~/../convex/_generated/api";
import { PendingComponent } from "~/components/pending-component";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { TrashList } from "~/features/trash/components/trash-list";
import { useTrashList } from "~/features/trash/hooks/trash-queries";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export const Route = createFileRoute("/trash")({
  component: TrashRoute,
});

function TrashRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<PendingComponent />}>
        <TrashReady />
      </Suspense>
    </OwnerGate>
  );
}

function TrashReady() {
  const { data: trash } = useTrashList();
  const restoreDay = useConvexMutation(api.trash.restoreDay);
  const restoreRow = useConvexMutation(api.rows.restore);
  const purgeDay = useConvexMutation(api.trash.purgeDay);
  const purgeRow = useConvexMutation(api.trash.purgeRow);

  return (
    <TrashList
      onPurgeDay={(dayId) => {
        void purgeDay.mutateAsync({ dayId });
      }}
      onPurgeRow={(rowId) => {
        void purgeRow.mutateAsync({ rowId });
      }}
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
