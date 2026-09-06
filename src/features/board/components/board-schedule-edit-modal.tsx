import { Button, Group, Modal, Stack, Tooltip, type ModalProps } from "@mantine/core";
import { IconCheck, IconTrash } from "@tabler/icons-react";
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
  title: ModalProps["title"];
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
        <Group justify="space-between" wrap="wrap">
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
                leftSection={<IconTrash aria-hidden size={16} />}
                onClick={onDelete}
                type="button"
              >
                削除
              </Button>
            </Tooltip>
          )}
          <Group gap="sm" ml="auto" wrap="nowrap">
            <Button onClick={onClose} type="button" variant="default">
              {readOnly ? "閉じる" : "キャンセル"}
            </Button>
            {readOnly ? null : (
              <Button
                disabled={saveDisabled}
                form={formId}
                leftSection={<IconCheck aria-hidden size={16} />}
                loading={submitting}
                type="submit"
              >
                保存
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
