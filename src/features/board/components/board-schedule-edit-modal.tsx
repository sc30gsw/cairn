import { Button, Group, Modal, Stack, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";

export function BoardScheduleEditModal({
  children,
  deleteTooltip,
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
  deleteTooltip?: string;
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
            <Tooltip
              disabled={deleteTooltip === undefined}
              label={deleteTooltip}
              events={{ hover: true, focus: true, touch: true }}
            >
              <Button
                color="red"
                disabled={readOnly || submitting}
                onClick={onDelete}
                type="button"
              >
                削除
              </Button>
            </Tooltip>
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
