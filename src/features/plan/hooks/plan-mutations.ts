import { api } from "~/../convex/_generated/api";
import { useConvexMutation } from "~/lib/use-convex-mutation";

export function usePlanEventSave() {
  const mutateAsync = useConvexMutation(api.mutations.planEvents.save.save);
  return { mutateAsync };
}

export function usePlanEventRemove() {
  const mutateAsync = useConvexMutation(api.mutations.planEvents.remove.remove);
  return { mutateAsync };
}

export function usePlanEventSaveDay() {
  const mutateAsync = useConvexMutation(api.mutations.planEvents.saveDay.saveDay);
  return { mutateAsync };
}

export function usePlanExternalMove() {
  const mutateAsync = useConvexMutation(api.mutations.calendarSync.moveExternal.moveExternal);
  return { mutateAsync };
}

export function usePlanExternalRemove() {
  const mutateAsync = useConvexMutation(api.mutations.calendarSync.removeExternal.removeExternal);
  return { mutateAsync };
}

export function usePlanTemplateSave() {
  const mutateAsync = useConvexMutation(api.mutations.planTemplates.save.save);
  return { mutateAsync };
}

export function usePlanTemplateRemove() {
  const mutateAsync = useConvexMutation(api.mutations.planTemplates.remove.remove);
  return { mutateAsync };
}

export function usePlanTemplateSetForgotten() {
  const mutateAsync = useConvexMutation(
    api.mutations.planTemplates.setForgottenTemplate.setForgottenTemplate,
  );
  return { mutateAsync };
}

export function usePlanTemplateApply() {
  const mutateAsync = useConvexMutation(api.mutations.planTemplates.applyToDate.applyToDate);
  return { mutateAsync };
}

export function usePlanTemplateUnapply() {
  const mutateAsync = useConvexMutation(api.mutations.planTemplates.unapplyDate.unapplyDate);
  return { mutateAsync };
}
