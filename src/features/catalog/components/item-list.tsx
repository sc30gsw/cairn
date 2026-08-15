import { Field, Form, useForm } from "@formisch/react";
import { Button, Group, NativeSelect, Stack, TextInput } from "@mantine/core";
import type { FunctionReturnType } from "convex/server";
import * as v from "valibot";
import { CATEGORIES } from "~domain/categories";

import type { api } from "~/../convex/_generated/api";

const ItemSchema = v.object({
  category: v.picklist(CATEGORIES),
  name: v.pipe(v.string(), v.minLength(1, "項目名は必須です")),
});

type ItemDto = FunctionReturnType<typeof api.items.list>[number];

type ItemListProps = {
  items: ItemDto[];
  onCreate: (input: { category: ItemDto["category"]; name: string }) => void;
  onRemove: (itemId: ItemDto["_id"]) => void;
  onRename: (input: {
    category: ItemDto["category"];
    itemId: ItemDto["_id"];
    name: string;
  }) => void;
};

export function ItemList({ items, onCreate, onRemove, onRename }: ItemListProps) {
  const form = useForm({
    initialInput: { category: "その他", name: "" },
    schema: ItemSchema,
  });

  return (
    <Stack gap="md">
      <Form
        of={form}
        onSubmit={(output) => {
          onCreate(output);
        }}
      >
        <Group align="flex-end">
          <Field of={form} path={["name"]}>
            {(field) => (
              <TextInput
                {...field.props}
                error={field.errors?.[0]}
                label="項目名"
                value={field.input}
              />
            )}
          </Field>
          <Field of={form} path={["category"]}>
            {(field) => (
              <NativeSelect
                {...field.props}
                data={[...CATEGORIES]}
                error={field.errors?.[0]}
                label="カテゴリ"
                value={field.input}
              />
            )}
          </Field>
          <Button type="submit">項目を追加</Button>
        </Group>
      </Form>
      {items.map((item) => (
        <Group key={item._id} justify="space-between">
          <span>
            {item.name}（{item.category}）
          </span>
          <Button
            onClick={() =>
              onRename({ category: item.category, itemId: item._id, name: `${item.name}改` })
            }
            variant="light"
          >
            {item.name}を改名
          </Button>
          <Button color="red" onClick={() => onRemove(item._id)} variant="subtle">
            {item.name}を削除
          </Button>
        </Group>
      ))}
    </Stack>
  );
}
