import { Field, Form, useForm } from "@formisch/react";
import { Button, Group, NativeSelect, NumberInput, TextInput } from "@mantine/core";

import type { ItemDto } from "~/features/catalog/types/item";
import { parseItemId } from "~/features/catalog/types/item";
import { AdhocRowSchema } from "~/features/today/schemas/adhoc-row-schema";

type AdhocRowFormProps = {
  items: ItemDto[];
  onAdd: (input: { content: string; itemId: ItemDto["_id"]; minutes: number }) => void;
};

export function AdhocRowForm({ items, onAdd }: AdhocRowFormProps) {
  const first = items[0];
  const form = useForm({
    initialInput: {
      content: "",
      itemId: first?._id ?? "",
      minutes: 20,
    },
    schema: AdhocRowSchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onAdd({
          content: output.content,
          itemId: parseItemId(output.itemId),
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
        <Button disabled={first === undefined} type="submit">
          行を足す
        </Button>
      </Group>
    </Form>
  );
}
