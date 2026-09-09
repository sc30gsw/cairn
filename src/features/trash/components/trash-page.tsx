import { Result } from "better-result";
import { Suspense } from "react";

import { TrashList } from "~/features/trash/components/trash-list";
import { TrashPending } from "~/features/trash/components/trash-pending";
import {
  usePurgeDay,
  usePurgeMany,
  usePurgeRow,
  useRestoreDay,
  useRestoreMany,
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
  const restoreMany = useRestoreMany();
  const restoreRow = useRestoreRow();
  const purgeDay = usePurgeDay();
  const purgeMany = usePurgeMany();
  const purgeRow = usePurgeRow();

  return (
    <TrashList
      onPurgeDay={(dayId) => {
        void runMutation(() => purgeDay.mutateAsync({ dayId }), {
          successMessage: "日を完全に削除しました",
        });
      }}
      onPurgeMany={(input) =>
        runMutation(() => purgeMany.mutateAsync(input), {
          successMessage: "選択した項目を完全に削除しました",
        })
      }
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
      onRestoreMany={async (input) => {
        const result = await runMutation(() => restoreMany.mutateAsync(input), {
          successMessage: (value) => {
            const restored = value.restoredDayIds.length + value.restoredRowIds.length;
            const failed = value.failedDayIds.length + value.failedRowIds.length;
            return failed === 0
              ? `${restored}件を復元しました`
              : `${restored}件を復元しました。${failed}件は再試行できます`;
          },
        });
        return Result.isOk(result) ? result.value : null;
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
