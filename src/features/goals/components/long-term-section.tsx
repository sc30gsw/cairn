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
  form: ReactNode;
  groups: ReactNode[];
  onAdd: (() => void) | undefined;
};

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
