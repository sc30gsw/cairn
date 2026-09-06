import { Button, Modal, Skeleton, Stack, Tooltip } from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";
import { Suspense } from "react";

import {
  CALENDAR_SYNC_TITLE,
  CalendarSyncSection,
} from "~/features/board/components/calendar-sync-section";
import { boardRoute } from "~/features/board/lib/board-route-api";

export const BOARD_CALENDAR_SYNC_TOOLTIP =
  "Google カレンダーとの連携・同期状態を確認します。連携後は、外部予定を「予定」タブの日・週表示で確認できます。";

export function BoardCalendarSyncButton() {
  const { calendarSync } = boardRoute.useSearch();
  const navigate = boardRoute.useNavigate();

  function setOpened(opened: boolean) {
    void navigate({
      search: (current) => ({ ...current, calendarSync: opened ? true : undefined }),
    });
  }

  return (
    <>
      <Tooltip
        events={{ focus: true, hover: true, touch: true }}
        interactive
        label={BOARD_CALENDAR_SYNC_TOOLTIP}
        multiline
        w={280}
        withArrow
      >
        <Button
          aria-haspopup="dialog"
          leftSection={<IconCalendar aria-hidden size={18} />}
          onClick={() => setOpened(true)}
          variant="light"
        >
          {CALENDAR_SYNC_TITLE}
        </Button>
      </Tooltip>
      <Modal
        closeButtonProps={{ "aria-label": "カレンダー同期を閉じる" }}
        onClose={() => setOpened(false)}
        opened={calendarSync === true}
        size="lg"
        title={CALENDAR_SYNC_TITLE}
      >
        <Suspense
          fallback={
            <Stack aria-label="カレンダー同期を読み込み中" component="output" gap="md">
              <Skeleton animate={false} height={40} />
              <Skeleton animate={false} height={120} />
            </Stack>
          }
        >
          <CalendarSyncSection />
        </Suspense>
      </Modal>
    </>
  );
}
