import { Field, Form, useForm } from "@formisch/react";
import { Button, Card, Grid, Select, Stack, TextInput, Title } from "@mantine/core";
import { CATEGORIES } from "~domain/categories";

import { ItemSchema } from "~/features/catalog/schemas/item-schema";
import type { ItemDto } from "~/features/catalog/types/item";
import { onRequiredSelect } from "~/lib/select";

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

const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({ label: category, value: category }));

export function ItemList({ items, onCreate, onRemove, onRename }: ItemListProps) {
  const form = useForm({
    initialInput: { category: "その他", name: "" },
    schema: ItemSchema,
  });

  return (
    <Stack gap="md">
      <Title order={1}>項目</Title>
      <Card>
        <Form
          of={form}
          onSubmit={(output) => {
            onCreate(output);
          }}
        >
          <Grid align="flex-end" gap="sm">
            <Grid.Col span={{ base: 12, sm: 6 }}>
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
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Field of={form} path={["category"]}>
                {(field) => (
                  <Select
                    {...field.props}
                    data={CATEGORY_OPTIONS}
                    error={field.errors?.[0]}
                    label="カテゴリ"
                    onChange={onRequiredSelect((value) => {
                      field.onChange(value as ItemDto["category"]);
                    })}
                    value={field.input}
                  />
                )}
              </Field>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 2 }}>
              <Button fullWidth type="submit">
                項目を追加
              </Button>
            </Grid.Col>
          </Grid>
        </Form>
      </Card>
      {items.map((item) => (
        <ItemEditor key={item._id} item={item} onRemove={onRemove} onRename={onRename} />
      ))}
    </Stack>
  );
}

function ItemEditor({
  item,
  onRemove,
  onRename,
}: {
  item: ItemDto;
  onRemove: ItemListProps["onRemove"];
  onRename: ItemListProps["onRename"];
}) {
  const form = useForm({
    initialInput: { category: item.category, name: item.name },
    schema: ItemSchema,
  });

  return (
    <Card padding="md">
      <Form
        of={form}
        onSubmit={(output) => {
          onRename({ ...output, itemId: item._id });
        }}
      >
        <Grid align="flex-end" gap="sm">
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <Field of={form} path={["name"]}>
              {(field) => (
                <TextInput
                  {...field.props}
                  aria-label={`${item.name}の新しい名前`}
                  error={field.errors?.[0]}
                  label={item.name}
                  value={field.input}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 3 }}>
            <Field of={form} path={["category"]}>
              {(field) => (
                <Select
                  {...field.props}
                  aria-label={`${item.name}のカテゴリ`}
                  data={CATEGORY_OPTIONS}
                  error={field.errors?.[0]}
                  onChange={onRequiredSelect((value) => {
                    field.onChange(value as ItemDto["category"]);
                  })}
                  value={field.input}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 2 }}>
            <Button fullWidth type="submit">
              {item.name}を改名
            </Button>
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 2 }}>
            <Button
              color="red"
              fullWidth
              onClick={() => onRemove(item._id)}
              type="button"
              variant="subtle"
            >
              {item.name}を削除
            </Button>
          </Grid.Col>
        </Grid>
      </Form>
    </Card>
  );
}
