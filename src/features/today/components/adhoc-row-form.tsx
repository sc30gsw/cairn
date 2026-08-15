import { Field, Form, useForm } from "@formisch/react";
import { Button, Group, NativeSelect, NumberInput, TextInput } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";
import * as v from "valibot";

import type { api } from "~/../convex/_generated/api";

const AdhocSchema = v.object({
  content: v.string(),
  itemId: v.pipe(v.string(), v.minLength(1, "項目を選んでください")),
  minutes: v.pipe(v.number(), v.minValue(0, "分数は0以上です")),
});

type ItemDto = FunctionReturnType<typeof api.items.list>[number];

type AdhocRowFormProps = {
  items: ItemDto[];
  onAdd: (input: { content: string; itemId: ItemDto["_id"]; minutes: number }) => void;
};

export function AdhocRowForm({ items, onAdd }: AdhocRowFormProps) {
  const form = useForm({
    initialInput: {
      content: "",
      itemId: items[0]?._id ?? "",
      minutes: 20,
    },
    schema: AdhocSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onAdd({
          content: output.content,
          itemId: output.itemId as ItemDto["_id"],
          minutes: output.minutes,
        });
      }}
    >
      <Group align="flex-end" gap="xs" wrap="wrap">
        <Field of={form} path={["itemId"]}>
          {(field) => (
            <NativeSelect
              {...field.props}
              data={items.map((item) => ({ label: item.name, value: item._id }))}
              error={field.errors?.[0]}
              label="その日限りの項目"
              value={field.input}
            />
          )}
        </Field>
        <Field of={form} path={["content"]}>
          {(field) => (
            <TextInput
              {...field.props}
              error={field.errors?.[0]}
              label="内容"
              value={field.input}
            />
          )}
        </Field>
        <Field of={form} path={["minutes"]}>
          {(field) => (
            <NumberInput
              {...field.props}
              error={field.errors?.[0]}
              label="分数"
              min={0}
              onChange={(value) => field.onChange(typeof value === "number" ? value : 0)}
              value={field.input}
            />
          )}
        </Field>
        <Button type="submit">行を足す</Button>
      </Group>
    </Form>
  );
}
