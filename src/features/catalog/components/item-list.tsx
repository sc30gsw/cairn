import { Field, Form, useForm } from "@formisch/react";
import { Button, Card, Grid, Select, Stack, Text, TextInput, Title } from "@mantine/core";

import { CategorySchema } from "~/features/catalog/schemas/category-schema";
import { ItemSchema } from "~/features/catalog/schemas/item-schema";
import type { CategoryDto, ItemDto } from "~/features/catalog/types/item";
import { parseCategoryId } from "~/features/catalog/types/item";
import { onRequiredSelect } from "~/lib/select";

type ItemListProps = {
  categories: CategoryDto[];
  items: ItemDto[];
  onCreateCategory: (input: { name: string }) => void;
  onCreateItem: (input: { categoryId: CategoryDto["_id"]; name: string }) => void;
  onRemoveCategory: (categoryId: CategoryDto["_id"]) => void;
  onRemoveItem: (itemId: ItemDto["_id"]) => void;
  onRenameCategory: (input: { categoryId: CategoryDto["_id"]; name: string }) => void;
  onRenameItem: (input: {
    categoryId: CategoryDto["_id"];
    itemId: ItemDto["_id"];
    name: string;
  }) => void;
};

export function ItemList({
  categories,
  items,
  onCreateCategory,
  onCreateItem,
  onRemoveCategory,
  onRemoveItem,
  onRenameCategory,
  onRenameItem,
}: ItemListProps) {
  const itemsByCategory = new Map<ItemDto["categoryId"], ItemDto[]>();
  for (const item of items) {
    const bucket = itemsByCategory.get(item.categoryId) ?? [];
    bucket.push(item);
    itemsByCategory.set(item.categoryId, bucket);
  }

  return (
    <Stack gap="md">
      <Title order={1}>項目</Title>
      <AddCategoryForm onCreate={onCreateCategory} />
      {categories.length > 0 ? (
        <AddItemForm categories={categories} onCreate={onCreateItem} />
      ) : null}
      {categories.map((category) => (
        <CategoryBlock
          key={category._id}
          categories={categories}
          category={category}
          items={itemsByCategory.get(category._id) ?? []}
          onRemoveCategory={onRemoveCategory}
          onRemoveItem={onRemoveItem}
          onRenameCategory={onRenameCategory}
          onRenameItem={onRenameItem}
        />
      ))}
    </Stack>
  );
}

function AddCategoryForm({ onCreate }: { onCreate: ItemListProps["onCreateCategory"] }) {
  const form = useForm({
    initialInput: { name: "" },
    schema: CategorySchema,
  });

  return (
    <Card>
      <Form
        of={form}
        onSubmit={(output) => {
          onCreate(output);
        }}
      >
        <Grid align="flex-end" gap="sm">
          <Grid.Col span={{ base: 12, sm: 9 }}>
            <Field of={form} path={["name"]}>
              {(field) => (
                <TextInput
                  {...field.props}
                  error={field.errors?.[0]}
                  label="カテゴリー"
                  value={field.input}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 3 }}>
            <Button fullWidth type="submit">
              カテゴリーを追加
            </Button>
          </Grid.Col>
        </Grid>
      </Form>
    </Card>
  );
}

function AddItemForm({
  categories,
  onCreate,
}: {
  categories: CategoryDto[];
  onCreate: ItemListProps["onCreateItem"];
}) {
  const first = categories[0];
  const form = useForm({
    initialInput: { categoryId: first?._id ?? "", name: "" },
    schema: ItemSchema,
  });
  const options = categories.map((category) => ({ label: category.name, value: category._id }));

  return (
    <Card>
      <Form
        of={form}
        onSubmit={(output) => {
          onCreate({ categoryId: parseCategoryId(output.categoryId), name: output.name });
        }}
      >
        <Grid align="flex-end" gap="sm">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Field of={form} path={["categoryId"]}>
              {(field) => (
                <Select
                  {...field.props}
                  data={options}
                  error={field.errors?.[0]}
                  label="カテゴリー"
                  onChange={onRequiredSelect(field.onChange)}
                  value={field.input}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 5 }}>
            <Field of={form} path={["name"]}>
              {(field) => (
                <TextInput
                  {...field.props}
                  error={field.errors?.[0]}
                  label="学習内容"
                  value={field.input}
                />
              )}
            </Field>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 3 }}>
            <Button fullWidth type="submit">
              学習内容を追加
            </Button>
          </Grid.Col>
        </Grid>
      </Form>
    </Card>
  );
}

function CategoryBlock({
  categories,
  category,
  items,
  onRemoveCategory,
  onRemoveItem,
  onRenameCategory,
  onRenameItem,
}: {
  categories: CategoryDto[];
  category: CategoryDto;
  items: ItemDto[];
  onRemoveCategory: ItemListProps["onRemoveCategory"];
  onRemoveItem: ItemListProps["onRemoveItem"];
  onRenameCategory: ItemListProps["onRenameCategory"];
  onRenameItem: ItemListProps["onRenameItem"];
}) {
  return (
    <Card padding="md">
      <Stack gap="md">
        <CategoryEditor
          category={category}
          onRemove={onRemoveCategory}
          onRename={onRenameCategory}
        />
        {items.length === 0 ? <Text c="dimmed">このカテゴリーの学習内容はありません。</Text> : null}
        {items.map((item) => (
          <ItemEditor
            key={item._id}
            categories={categories}
            categoryId={category._id}
            item={item}
            onRemove={onRemoveItem}
            onRename={onRenameItem}
          />
        ))}
      </Stack>
    </Card>
  );
}

function CategoryEditor({
  category,
  onRemove,
  onRename,
}: {
  category: CategoryDto;
  onRemove: ItemListProps["onRemoveCategory"];
  onRename: ItemListProps["onRenameCategory"];
}) {
  const form = useForm({
    initialInput: { name: category.name },
    schema: CategorySchema,
  });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onRename({ categoryId: category._id, name: output.name });
      }}
    >
      <Grid align="flex-end" gap="sm">
        <Grid.Col span={{ base: 12, sm: 7 }}>
          <Field of={form} path={["name"]}>
            {(field) => (
              <TextInput
                {...field.props}
                aria-label={`${category.name}の新しい名前`}
                error={field.errors?.[0]}
                label="カテゴリー"
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 3 }}>
          <Button fullWidth type="submit">
            {category.name}を更新
          </Button>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 2 }}>
          <Button
            color="red"
            fullWidth
            onClick={() => onRemove(category._id)}
            type="button"
            variant="subtle"
          >
            {category.name}を削除
          </Button>
        </Grid.Col>
      </Grid>
    </Form>
  );
}

function ItemEditor({
  categories,
  categoryId,
  item,
  onRemove,
  onRename,
}: {
  categories: CategoryDto[];
  categoryId: CategoryDto["_id"];
  item: ItemDto;
  onRemove: ItemListProps["onRemoveItem"];
  onRename: ItemListProps["onRenameItem"];
}) {
  const form = useForm({
    initialInput: { categoryId, name: item.name },
    schema: ItemSchema,
  });
  const options = categories.map((category) => ({ label: category.name, value: category._id }));

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onRename({
          categoryId: parseCategoryId(output.categoryId),
          itemId: item._id,
          name: output.name,
        });
      }}
    >
      <Grid align="flex-end" gap="sm">
        <Grid.Col span={{ base: 12, sm: 3 }}>
          <Field of={form} path={["categoryId"]}>
            {(field) => (
              <Select
                {...field.props}
                aria-label={`${item.name}のカテゴリー`}
                data={options}
                error={field.errors?.[0]}
                label="カテゴリー"
                onChange={onRequiredSelect(field.onChange)}
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 5 }}>
          <Field of={form} path={["name"]}>
            {(field) => (
              <TextInput
                {...field.props}
                aria-label={`${item.name}の新しい名前`}
                error={field.errors?.[0]}
                label="学習内容"
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 2 }}>
          <Button fullWidth type="submit">
            {item.name}を更新
          </Button>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 2 }}>
          <Button color="red" fullWidth onClick={() => onRemove(item._id)} type="button" variant="subtle">
            {item.name}を削除
          </Button>
        </Grid.Col>
      </Grid>
    </Form>
  );
}
