import {
  useApplyItemOrder,
  useCreateCategory,
  useCreateItem,
  useRemoveCategory,
  useRemoveItem,
  useRenameCategory,
  useRenameItem,
} from "~/features/catalog/hooks/catalog-mutations";
import type {
  ApplyItemOrderInput,
  CreateCategoryInput,
  CreateItemInput,
  RemoveCategoryInput,
  RemoveItemInput,
  RenameCategoryInput,
  RenameItemInput,
} from "~/features/catalog/types/mutations";
import { runMutation } from "~/lib/run-mutation";

export type CatalogItemActions = ReturnType<typeof useCatalogItemActions>;

export function useCatalogItemActions() {
  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const removeCategory = useRemoveCategory();
  const createItem = useCreateItem();
  const renameItem = useRenameItem();
  const applyItemOrder = useApplyItemOrder();
  const removeItem = useRemoveItem();

  return {
    onApplyItemOrder: (input: ApplyItemOrderInput) =>
      runMutation(() => applyItemOrder(input), { successMessage: "並び順を更新しました" }).then(
        () => undefined,
      ),
    onCreateCategory: (input: CreateCategoryInput) =>
      runMutation(() => createCategory.mutateAsync(input), {
        successMessage: "カテゴリーを追加しました",
      }).then(() => undefined),
    onCreateItem: (input: CreateItemInput) =>
      runMutation(() => createItem.mutateAsync(input), {
        successMessage: "項目を追加しました",
      }).then(() => undefined),
    onRemoveCategory: (categoryId: RemoveCategoryInput["categoryId"]) =>
      runMutation(() => removeCategory.mutateAsync({ categoryId }), {
        successMessage: "カテゴリーを削除しました",
      }).then(() => undefined),
    onRemoveItem: (itemId: RemoveItemInput["itemId"]) =>
      runMutation(() => removeItem.mutateAsync({ itemId }), {
        successMessage: "項目を削除しました",
      }).then(() => undefined),
    onRenameCategory: (input: RenameCategoryInput) =>
      runMutation(() => renameCategory.mutateAsync(input), {
        successMessage: "カテゴリー名を変更しました",
      }).then(() => undefined),
    onRenameItem: (input: RenameItemInput) =>
      runMutation(() => renameItem(input), { successMessage: "項目名を変更しました" }).then(
        () => undefined,
      ),
  };
}
