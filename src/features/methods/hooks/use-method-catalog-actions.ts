import {
  useApplyLaneOrder,
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
  ApplyLaneOrderInput,
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
  const applyLaneOrder = useApplyLaneOrder();

  return {
    onApplyLaneOrder: (input: ApplyLaneOrderInput) =>
      runMutation(() => applyLaneOrder(input), {
        successMessage: "レーンの並びを更新しました",
      }),
    onApplyMethodOrder: (input: ApplyMethodOrderInput) =>
      runMutation(() => applyMethodOrder(input), { successMessage: "並び順を更新しました" }),
    onCreateLane: (input: CreateLaneInput) =>
      runMutation(() => createLane.mutateAsync(input), {
        successMessage: "レーンを追加しました",
      }),
    onCreateMethod: (input: CreateMethodInput) =>
      runMutation(() => createMethod.mutateAsync(input), {
        successMessage: "方法を追加しました",
      }),
    onRemoveLane: (laneId: RemoveLaneInput["laneId"]) =>
      runMutation(() => removeLane.mutateAsync({ laneId }), {
        successMessage: "レーンを削除しました",
      }),
    onRemoveMethod: (methodId: RemoveMethodInput["methodId"]) =>
      runMutation(() => removeMethod.mutateAsync({ methodId }), {
        successMessage: "方法を削除しました",
      }),
    onRenameLane: (input: RenameLaneInput) =>
      runMutation(() => renameLane.mutateAsync(input), {
        successMessage: "レーン名を変更しました",
      }),
    onSetNowViewing: (input: SetNowViewingInput) =>
      runMutation(() => setNowViewing.mutateAsync(input), {
        successMessage: input.nowViewing ? "いま見るにしました" : "いま見るを外しました",
      }),
    onUpdateMethod: (input: UpdateMethodInput) =>
      runMutation(() => updateMethod.mutateAsync(input), {
        successMessage: "方法を保存しました",
      }),
  };
}
