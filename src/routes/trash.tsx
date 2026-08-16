import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { TrashList } from "~/features/trash/components/trash-list";
import { TrashPending } from "~/features/trash/components/trash-pending";
import {
  usePurgeDay,
  usePurgeRow,
  useRestoreDay,
  useRestoreRow,
} from "~/features/trash/hooks/trash-mutations";
import { useTrashList } from "~/features/trash/hooks/trash-queries";

export const Route = createFileRoute("/trash")({
  component: TrashRoute,
});

function TrashRoute() {
  return (
    <OwnerGate>
      <Suspense fallback={<TrashPending />}>
        <TrashReady />
      </Suspense>
    </OwnerGate>
  );
}

function TrashReady() {
  const { data: trash } = useTrashList();
  const restoreDay = useRestoreDay();
  const restoreRow = useRestoreRow();
  const purgeDay = usePurgeDay();
  const purgeRow = usePurgeRow();

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
