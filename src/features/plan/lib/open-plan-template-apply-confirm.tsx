import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { DateJst } from "~domain/jst";

import { formatPlanDateTooltip } from "~/features/plan/lib/plan-date-tooltip";

export const PLAN_TEMPLATE_APPLY_CONFIRM = "適用";
export const PLAN_TEMPLATE_APPLY_BODY =
  "この日の予定を、この計画の内容に置き換えます。すでにある予定と、そこから生えた記録は完全に削除されます。日で足した独立した記録は残ります。";

export function planTemplateApplyTitle(name: string, dateJst: DateJst) {
  return `「${name}」を ${formatPlanDateTooltip(dateJst)} に適用しますか？`;
}

export function openPlanTemplateApplyConfirm({
  dateJst,
  name,
  onConfirm,
}: {
  dateJst: DateJst;
  name: string;
  onConfirm: () => void;
}) {
  modals.openConfirmModal({
    children: <Text>{PLAN_TEMPLATE_APPLY_BODY}</Text>,
    labels: { cancel: "キャンセル", confirm: PLAN_TEMPLATE_APPLY_CONFIRM },
    onConfirm,
    title: planTemplateApplyTitle(name, dateJst),
  });
}
