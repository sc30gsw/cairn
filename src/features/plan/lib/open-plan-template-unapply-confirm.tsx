import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { DateJst } from "~domain/jst";

import { formatPlanDateTooltip } from "~/features/plan/lib/plan-date-tooltip";

export const PLAN_TEMPLATE_UNAPPLY_CONFIRM = "解除";
export const PLAN_TEMPLATE_UNAPPLY_BODY =
  "この日の予定と、そこから生えた記録は完全に削除されます。日で足した独立した記録は残ります。";

export function planTemplateUnapplyTitle(name: string, dateJst: DateJst) {
  return `「${name}」の適用を ${formatPlanDateTooltip(dateJst)} から外しますか？`;
}

export function openPlanTemplateUnapplyConfirm({
  dateJst,
  name,
  onConfirm,
}: {
  dateJst: DateJst;
  name: string;
  onConfirm: () => void;
}) {
  modals.openConfirmModal({
    children: <Text>{PLAN_TEMPLATE_UNAPPLY_BODY}</Text>,
    confirmProps: { color: "red" },
    labels: { cancel: "キャンセル", confirm: PLAN_TEMPLATE_UNAPPLY_CONFIRM },
    onConfirm,
    title: planTemplateUnapplyTitle(name, dateJst),
  });
}
