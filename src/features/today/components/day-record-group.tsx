import type { DateJst } from "~domain/jst";

import { GroupRecordEditor } from "~/features/today/components/group-record-editor";
import { RowEditor } from "~/features/today/components/row-editor";
import type { DayRowGroup } from "~/features/today/lib/group-day-rows";
import type { DayRow } from "~/features/today/types/day";
import type {
  ConfirmRowInput,
  FlagReviewInput,
  RemoveRowInput,
  SkipRowInput,
} from "~/features/today/types/mutations";
import type { MutationResult } from "~/lib/run-mutation";

type DayRecordGroupProps = {
  disabled: boolean;
  group: DayRowGroup;
  onConfirm: (input: ConfirmRowInput) => Promise<MutationResult>;
  onConfirmMany: (inputs: ConfirmRowInput[]) => Promise<MutationResult>;
  onFlagReview: (input: FlagReviewInput) => void;
  onRemove: (rowId: RemoveRowInput["rowId"]) => void;
  onSkip: (rowId: SkipRowInput["rowId"]) => void;
  onSkipMany: (rowIds: SkipRowInput["rowId"][]) => void;
  onUnflagReview: (rowId: DayRow["_id"]) => void;
  onUnskip: (rowId: SkipRowInput["rowId"]) => void;
  onUnskipMany: (rowIds: SkipRowInput["rowId"][]) => void;
  todayJst: DateJst;
};

export function DayRecordGroup({
  disabled,
  group,
  onConfirm,
  onConfirmMany,
  onFlagReview,
  onRemove,
  onSkip,
  onSkipMany,
  onUnflagReview,
  onUnskip,
  onUnskipMany,
  todayJst,
}: DayRecordGroupProps) {
  const solo = group.rows[0];
  if (group.rows.length === 1 && solo !== undefined) {
    return (
      <RowEditor
        disabled={disabled}
        onConfirm={onConfirm}
        onFlagReview={onFlagReview}
        onRemove={onRemove}
        onSkip={onSkip}
        onUnflagReview={onUnflagReview}
        onUnskip={onUnskip}
        row={solo}
        todayJst={todayJst}
      />
    );
  }

  return (
    <GroupRecordEditor
      disabled={disabled}
      group={group}
      onConfirmMany={onConfirmMany}
      onSkipMany={onSkipMany}
      onUnskipMany={onUnskipMany}
    />
  );
}
