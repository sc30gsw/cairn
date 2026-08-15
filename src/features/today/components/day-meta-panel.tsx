import { Field, Form, useForm } from "@formisch/react";
import { Button, SegmentedControl, Stack, Textarea, Title } from "@mantine/core";
import type { Condition } from "~domain/conditions";
import { CONDITIONS } from "~domain/conditions";

import { MemoSchema } from "~/features/today/schemas/memo-schema";

type DayMetaPanelProps = {
  condition: Condition | null;
  memo: null | string;
  onSaveCondition: (condition: Condition) => void;
  onSaveMemo: (memo: string) => void;
};

export function DayMetaPanel({ condition, memo, onSaveCondition, onSaveMemo }: DayMetaPanelProps) {
  const form = useForm({
    initialInput: { memo: memo ?? "" },
    schema: MemoSchema,
  });

  return (
    <section aria-label="コンディションとメモ">
      <Stack gap="sm">
        <Title order={3}>コンディションとメモ</Title>
        <SegmentedControl
          aria-label="コンディション"
          data={[
            { label: "未設定", value: "unset" },
            ...CONDITIONS.map((value) => ({ label: value, value })),
          ]}
          fullWidth
          onChange={(value) => {
            if (value === "好調" || value === "普通" || value === "崩れた") {
              onSaveCondition(value);
            }
          }}
          value={condition ?? "unset"}
        />
        <Form
          of={form}
          onSubmit={(output) => {
            onSaveMemo(output.memo);
          }}
        >
          <Field of={form} path={["memo"]}>
            {(field) => (
              <Textarea
                {...field.props}
                error={field.errors?.[0]}
                label="メモ"
                minRows={3}
                value={field.input}
              />
            )}
          </Field>
          <Button mt="sm" type="submit" variant="light">
            メモを保存
          </Button>
        </Form>
      </Stack>
    </section>
  );
}
