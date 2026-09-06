import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconBrandGoogle } from "@tabler/icons-react";

import { formatScheduleTimeLabel } from "~/features/board/lib/schedule-instant";
import type { BoardExternalEvent } from "~/features/board/types/board";
import { NUMERAL_FONT } from "~/lib/theme";

export const EXTERNAL_EVENT_MODAL_TITLE = "外部予定";
export const EXTERNAL_EVENT_REMOVE_LABEL = "Google カレンダーから削除";
const EXTERNAL_EVENT_REMOVE_CONFIRM_TITLE = "この予定を Google カレンダーから削除しますか？";
const EXTERNAL_EVENT_REMOVE_CONFIRM =
  "Google カレンダー側の予定も消えます。記録や学習量には影響しません。";
const EXTERNAL_EVENT_HINT =
  "Google カレンダーの予定です。ドラッグで動かすと Google 側も動きます。題名の変更や新規作成は Google カレンダーで行ってください。";

type BoardScheduleExternalModalProps = {
  external: BoardExternalEvent | null;
  onClose: () => void;
  onRemove: (externalId: BoardExternalEvent["_id"]) => Promise<void>;
};

function formatRange(external: BoardExternalEvent): string {
  const startDay = external.startAt.slice(0, 10);
  const endDay = external.endAt.slice(0, 10);
  if (external.allDay) {
    return startDay === endDay ? `${startDay} 終日` : `${startDay} 〜 ${endDay} 終日`;
  }
  const start = formatScheduleTimeLabel(external.startAt);
  const end = formatScheduleTimeLabel(external.endAt);
  return startDay === endDay
    ? `${startDay} ${start} 〜 ${end}`
    : `${startDay} ${start} 〜 ${endDay} ${end}`;
}

export function BoardScheduleExternalModal({
  external,
  onClose,
  onRemove,
}: BoardScheduleExternalModalProps) {
  function requestRemove() {
    if (external === null) {
      return;
    }
    const externalId = external._id;
    modals.openConfirmModal({
      children: EXTERNAL_EVENT_REMOVE_CONFIRM,
      confirmProps: { color: "red" },
      labels: { cancel: "キャンセル", confirm: EXTERNAL_EVENT_REMOVE_LABEL },
      onConfirm: () => {
        onClose();
        void onRemove(externalId);
      },
      title: EXTERNAL_EVENT_REMOVE_CONFIRM_TITLE,
    });
  }

  return (
    <Modal onClose={onClose} opened={external !== null} title={EXTERNAL_EVENT_MODAL_TITLE}>
      {external === null ? null : (
        <Stack gap="md">
          <Stack gap={2}>
            <Text fw={600} size="lg">
              {external.title}
            </Text>
            <Text ff={NUMERAL_FONT} size="sm">
              {formatRange(external)}
            </Text>
            <Group gap={6} wrap="nowrap">
              <IconBrandGoogle aria-hidden size={14} />
              <Text c="dimmed" size="sm">
                {external.calendarName}
              </Text>
            </Group>
          </Stack>
          <Text c="dimmed" size="xs">
            {EXTERNAL_EVENT_HINT}
          </Text>
          <Group justify="space-between" wrap="nowrap">
            <Button color="red" onClick={requestRemove} type="button" variant="light">
              {EXTERNAL_EVENT_REMOVE_LABEL}
            </Button>
            <Button onClick={onClose} type="button" variant="default">
              閉じる
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
