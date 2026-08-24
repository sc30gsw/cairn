import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";

export const LONG_TERM_SECTION_TITLE = "長期目標";
export const LONG_TERM_ADD_LABEL = "長期目標を追加";
export const LONG_TERM_HINT =
  "期限を決めずに「〜できる」を積む層。ここから期限を刻むとチェックポイントになります。";
export const LONG_TERM_EMPTY_MESSAGE =
  "長期目標はまだありません。期限のない「〜できる」を1件置くと、その下に期限を刻めます。";

type LongTermSectionProps = {
  //? 新規長期目標フォーム。見出し直下に開く
  form: ReactNode;
  //? 親カード(ParentGoalGroup)の並び。編集中の親はフォームに差し替わっている
  groups: ReactNode[];
  //? undefined なら追加導線を出さない(フォームを開いている間)
  onAdd: (() => void) | undefined;
};

//? 0件でも見出しと追加導線は常に出す(本番目標から独立した導線という確定事項の受け皿)。
//? EmptyState はページに1つ = 本番目標なしのときだけなので、ここは薄字1行にする(#48 §7.3.3)
export function LongTermSection({ form, groups, onAdd }: LongTermSectionProps) {
  return (
    <Stack aria-label={LONG_TERM_SECTION_TITLE} component="section" gap="md">
      <Group gap="sm" justify="space-between" wrap="wrap">
        <Title order={2}>{LONG_TERM_SECTION_TITLE}</Title>
        {onAdd !== undefined && (
          <Button
            leftSection={<IconPlus aria-hidden size={14} />}
            onClick={onAdd}
            size="xs"
            type="button"
          >
            {LONG_TERM_ADD_LABEL}
          </Button>
        )}
      </Group>
      <Text c="dimmed" size="sm">
        {LONG_TERM_HINT}
      </Text>
      {form}
      {groups.length === 0 ? (
        <Text c="dimmed" size="sm">
          {LONG_TERM_EMPTY_MESSAGE}
        </Text>
      ) : (
        groups
      )}
    </Stack>
  );
}
