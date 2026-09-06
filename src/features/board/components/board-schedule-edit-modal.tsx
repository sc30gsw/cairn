import { Button, Group, Modal, Stack } from "@mantine/core";
import type { ReactNode } from "react";

export function BoardScheduleEditModal({
  children,
  deleteLabel = "削除",
  formId,
  onClose,
  onDelete,
  onExitTransitionEnd,
  opened,
  readOnly = false,
  saveDisabled = false,
  submitting = false,
  title,
}: {
  children: ReactNode;
  deleteLabel?: string;
  formId: string;
  onClose: () => void;
  onDelete?: () => void;
  onExitTransitionEnd?: () => void;
  opened: boolean;
  readOnly?: boolean;
  saveDisabled?: boolean;
  submitting?: boolean;
  title: string;
}) {
  return (
    <Modal
      onClose={onClose}
      onExitTransitionEnd={onExitTransitionEnd}
      opened={opened}
      title={title}
    >
      <Stack gap="md">
        {children}
        <Group justify="space-between" wrap="nowrap">
          {onDelete === undefined ? (
            <span />
          ) : (
            <Button color="red" disabled={readOnly || submitting} onClick={onDelete} type="button">
              {deleteLabel}
            </Button>
          )}
          <Group gap="sm" wrap="nowrap">
            <Button onClick={onClose} type="button" variant="default">
              {readOnly ? "閉じる" : "キャンセル"}
            </Button>
            {readOnly ? null : (
              <Button disabled={saveDisabled} form={formId} loading={submitting} type="submit">
                保存
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
