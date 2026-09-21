import { PLAN_WINDOW_MESSAGE } from "~domain/planEvent";

import {
  usePlanEventRemove,
  usePlanEventSave,
  usePlanExternalMove,
  usePlanExternalRemove,
} from "~/features/plan/hooks/plan-mutations";
import { instantsToPlanTimes } from "~/features/plan/lib/plan-event-instants";
import { dateToScheduleInstant } from "~/features/plan/lib/schedule-instant";
import type { PlanScheduleEventOutput } from "~/features/plan/schemas/board-schedule-event-schema";
import type { PlanScheduleBlock } from "~/features/plan/types/plan";
import { useTodayJst } from "~/hooks/use-today-jst";
import { runMutation } from "~/lib/run-mutation";

const silent = { silent: true } as const satisfies NonNullable<Parameters<typeof runMutation>[1]>;

function timesFromOutput(values: PlanScheduleEventOutput) {
  return instantsToPlanTimes(
    dateToScheduleInstant(values.start),
    dateToScheduleInstant(values.end),
  );
}

export function useBoardScheduleActions() {
  const todayJst = useTodayJst();
  const saveEvent = usePlanEventSave();
  const removeEvent = usePlanEventRemove();
  const moveExternal = usePlanExternalMove();
  const removeExternal = usePlanExternalRemove();

  return {
    onCreateBlock: (values: PlanScheduleEventOutput) => {
      const times = timesFromOutput(values);
      if (times === null) {
        return runMutation(() => Promise.reject(new Error(PLAN_WINDOW_MESSAGE)), silent);
      }
      return runMutation(
        () =>
          saveEvent.mutateAsync({
            dateJst: times.dateJst,
            endTime: times.endTime,
            itemId: values.itemId,
            priority: values.priority,
            startTime: times.startTime,
            title: values.title,
            todayJst,
          }),
        silent,
      );
    },
    onMoveBlock: (input: { endAt: string; event: PlanScheduleBlock; startAt: string }) => {
      const times = instantsToPlanTimes(input.startAt, input.endAt);
      if (times === null) {
        return runMutation(() => Promise.reject(new Error(PLAN_WINDOW_MESSAGE)), silent);
      }
      return runMutation(
        () =>
          saveEvent.mutateAsync({
            dateJst: times.dateJst,
            endTime: times.endTime,
            eventId: input.event._id,
            itemId: input.event.itemId,
            priority: input.event.priority,
            startTime: times.startTime,
            title: input.event.title,
            todayJst,
          }),
        silent,
      );
    },
    onMoveExternal: (input: Parameters<typeof moveExternal.mutateAsync>[0]) =>
      runMutation(() => moveExternal.mutateAsync(input), {
        successMessage: "Google カレンダーへの反映を送信しました",
      }),
    onRemoveBlock: (input: { eventId: PlanScheduleBlock["_id"] }) =>
      runMutation(() => removeEvent.mutateAsync({ eventId: input.eventId }), silent),
    onRemoveExternal: (input: Parameters<typeof removeExternal.mutateAsync>[0]) =>
      runMutation(() => removeExternal.mutateAsync(input), {
        successMessage: "Google カレンダーからの削除を送信しました",
      }),
    onUpdateBlock: (values: PlanScheduleEventOutput) => {
      const times = timesFromOutput(values);
      if (times === null || values.eventId === undefined) {
        return runMutation(() => Promise.reject(new Error(PLAN_WINDOW_MESSAGE)), silent);
      }
      return runMutation(
        () =>
          saveEvent.mutateAsync({
            dateJst: times.dateJst,
            endTime: times.endTime,
            eventId: values.eventId,
            itemId: values.itemId,
            priority: values.priority,
            startTime: times.startTime,
            title: values.title,
            todayJst,
          }),
        silent,
      );
    },
  };
}
