import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";

export const PLAN_TEMPLATE_REMOVE_BODY = "雛形だけを消します。すでに展開した予定は残ります。";
export const PLAN_TEMPLATE_REMOVE_CONFIRM = "削除";

export function planTemplateRemoveTitle(name: string) {
  return `「${name}」を削除しますか？`;
}

export function openPlanTemplateRemoveConfirm({
  name,
  onConfirm,
}: {
  name: string;
  onConfirm: () => void;
}) {
  modals.openConfirmModal({
    children: <Text>{PLAN_TEMPLATE_REMOVE_BODY}</Text>,
    confirmProps: { color: "red" },
    labels: { cancel: "キャンセル", confirm: PLAN_TEMPLATE_REMOVE_CONFIRM },
    onConfirm,
    title: planTemplateRemoveTitle(name),
  });
}
