import { Field, Form, reset, useForm, type SubmitHandler } from "@formisch/react";
import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { Result } from "better-result";
import { useEffect } from "react";

import { AchievementReflectionSchema } from "~/features/goals/schemas/achievement-reflection-schema";
import type { MasteryGoal } from "~/features/goals/types/goal";
import type { MutationResult } from "~/lib/run-mutation";

const ACHIEVEMENT_REFLECTION_TITLE = "達成にする";
export const ACHIEVEMENT_REFLECTION_LABEL = "振り返り（任意）";
export const ACHIEVEMENT_REFLECTION_SUBMIT = "達成にする";

type AchievementReflectionModalProps = {
  goal: MasteryGoal | null;
  onClose: () => void;
  onSubmit: (reflection: string | undefined) => Promise<MutationResult | undefined>;
};

export function AchievementReflectionModal({
  goal,
  onClose,
  onSubmit,
}: AchievementReflectionModalProps) {
  const form = useForm({
    initialInput: { reflection: goal?.reflection ?? "" },
    schema: AchievementReflectionSchema,
  });

  useEffect(() => {
    if (goal === null) {
      return;
    }
    reset(form, { initialInput: { reflection: goal.reflection ?? "" }, keepInput: false });
  }, [form, goal]);

  const handleSubmit: SubmitHandler<typeof AchievementReflectionSchema> = async (values) => {
    const result = await onSubmit(values.reflection === "" ? undefined : values.reflection);
    if (result !== undefined && Result.isOk(result)) onClose();
  };

  return (
    <Modal onClose={onClose} opened={goal !== null} title={ACHIEVEMENT_REFLECTION_TITLE}>
      <Form of={form} onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm">
            「{goal?.content}
            」を達成にします。何が効いたか、一行だけ残せます。書かなくても達成にできます。
          </Text>
          <Field of={form} path={["reflection"]}>
            {(field) => (
              <Textarea
                {...field.props}
                autosize
                error={field.errors?.[0]}
                label={ACHIEVEMENT_REFLECTION_LABEL}
                minRows={2}
                onChange={(event) => field.onChange(event.currentTarget.value)}
                placeholder="例: 毎朝の音読を3週間続けたのが効いた"
                value={field.input}
              />
            )}
          </Field>
          <Group gap="sm" justify="flex-end">
            <Button onClick={onClose} type="button" variant="default">
              キャンセル
            </Button>
            <Button color="green" loading={form.isSubmitting} type="submit">
              {ACHIEVEMENT_REFLECTION_SUBMIT}
            </Button>
          </Group>
        </Stack>
      </Form>
    </Modal>
  );
}
