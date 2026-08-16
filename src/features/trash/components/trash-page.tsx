import { Suspense } from "react";

import { TrashList } from "~/features/trash/components/trash-list";
import { TrashPending } from "~/features/trash/components/trash-pending";
import {
  usePurgeDay,
  usePurgeRow,
  useRestoreDay,
  useRestoreRow,
} from "~/features/trash/hooks/trash-mutations";
import { useTrashList } from "~/features/trash/hooks/trash-queries";
import { runMutation } from "~/lib/run-mutation";

export function TrashPage() {
  return (
    <Suspense fallback={<TrashPending />}>
      <TrashReady />
    </Suspense>
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
        void runMutation(() => purgeDay.mutateAsync({ dayId }), {
          successMessage: "日を完全に削除しました",
        });
      }}
      onPurgeRow={(rowId) => {
        void runMutation(() => purgeRow.mutateAsync({ rowId }), {
          successMessage: "記録を完全に削除しました",
        });
      }}
      onRestoreDay={(dayId) => {
        void runMutation(() => restoreDay.mutateAsync({ dayId }), {
          successMessage: "日を復元しました",
        });
      }}
      onRestoreRow={(rowId) => {
        void runMutation(() => restoreRow.mutateAsync({ rowId }), {
          successMessage: "記録を復元しました",
        });
      }}
      trash={trash}
    />
  );
}
