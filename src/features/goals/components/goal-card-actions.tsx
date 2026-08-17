import { ActionIcon, Group } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";

type GoalCardActionsProps = {
  goalName: string;
  onEdit: () => void;
  onRemove: () => void;
};

//? 目標名をアクセシブル名に入れて、カードが並んでもボタンを取り違えないようにする
export function GoalCardActions({ goalName, onEdit, onRemove }: GoalCardActionsProps) {
  return (
    <Group gap={4} wrap="nowrap">
      <ActionIcon aria-label={`${goalName}を編集`} onClick={onEdit} variant="subtle">
        <IconPencil aria-hidden size={16} />
      </ActionIcon>
      <ActionIcon aria-label={`${goalName}を削除`} color="red" onClick={onRemove} variant="subtle">
        <IconTrash aria-hidden size={16} />
      </ActionIcon>
    </Group>
  );
}
