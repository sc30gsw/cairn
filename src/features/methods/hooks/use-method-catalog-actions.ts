import {
  useApplyMethodOrder,
  useCreateLane,
  useCreateMethod,
  useRemoveLane,
  useRemoveMethod,
  useRenameLane,
  useSetNowViewing,
  useUpdateMethod,
} from "~/features/methods/hooks/method-catalog-mutations";
import type {
  ApplyMethodOrderInput,
  CreateLaneInput,
  CreateMethodInput,
  RemoveLaneInput,
  RemoveMethodInput,
  RenameLaneInput,
  SetNowViewingInput,
  UpdateMethodInput,
} from "~/features/methods/types/mutations";
import { runMutation } from "~/lib/run-mutation";

export type MethodCatalogActions = ReturnType<typeof useMethodCatalogActions>;

export function useMethodCatalogActions() {
  const createLane = useCreateLane();
  const renameLane = useRenameLane();
  const removeLane = useRemoveLane();
  const createMethod = useCreateMethod();
  const updateMethod = useUpdateMethod();
  const removeMethod = useRemoveMethod();
  const setNowViewing = useSetNowViewing();
  const applyMethodOrder = useApplyMethodOrder();

  return {
    onApplyMethodOrder: (input: ApplyMethodOrderInput) =>
      runMutation(() => applyMethodOrder(input), { successMessage: "並び順を更新しました" }).then(
        () => undefined,
      ),
    onCreateLane: (input: CreateLaneInput) =>
      runMutation(() => createLane.mutateAsync(input), {
        successMessage: "レーンを追加しました",
      }).then(() => undefined),
    onCreateMethod: (input: CreateMethodInput) =>
      runMutation(() => createMethod.mutateAsync(input), {
        successMessage: "方法を追加しました",
      }).then(() => undefined),
    onRemoveLane: (laneId: RemoveLaneInput["laneId"]) =>
      runMutation(() => removeLane.mutateAsync({ laneId }), {
        successMessage: "レーンを削除しました",
      }).then(() => undefined),
    onRemoveMethod: (methodId: RemoveMethodInput["methodId"]) =>
      runMutation(() => removeMethod.mutateAsync({ methodId }), {
        successMessage: "方法を削除しました",
      }).then(() => undefined),
    onRenameLane: (input: RenameLaneInput) =>
      runMutation(() => renameLane.mutateAsync(input), {
        successMessage: "レーン名を変更しました",
      }).then(() => undefined),
    onSetNowViewing: (input: SetNowViewingInput) =>
      runMutation(() => setNowViewing.mutateAsync(input), {
        successMessage: input.nowViewing ? "いま見るにしました" : "いま見るを外しました",
      }).then(() => undefined),
    onUpdateMethod: (input: UpdateMethodInput) =>
      runMutation(() => updateMethod.mutateAsync(input), {
        successMessage: "方法を保存しました",
      }).then(() => undefined),
  };
}
