import { Field, Form, useField, useForm } from "@formisch/react";
import { Button, Grid, NumberInput, Select } from "@mantine/core";

import { ConcreteActionField } from "~/components/concrete-action-field";
import { LabelAlignedCell } from "~/components/label-aligned-cell";
import { AdhocRowSchema } from "~/features/today/schemas/adhoc-row-schema";
import type { AddRowInput } from "~/features/today/types/mutations";
import { onRequiredSelect } from "~/lib/select";
import type { ItemDto } from "~/types/item";
import { parseItemId, unwrapItemId } from "~/types/item";

type AdhocRowFormProps = {
  items: ItemDto[];
  onAdd: (input: AddRowInput) => void;
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
  const itemIdField = useField(form, { path: ["itemId"] });
  const selectedItemName = items.find((item) => item._id === itemIdField.input)?.name;

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        onAdd({
          content: output.content,
          itemId: unwrapItemId(parseItemId(output.itemId)),
          minutes: output.minutes,
        });
      }}
    >
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Field of={form} path={["itemId"]}>
            {(field) => (
              <Select
                {...field.props}
                data={items.map((item) => ({ label: item.name, value: item._id }))}
                error={field.errors?.[0]}
                label="その日限りの項目"
                onChange={onRequiredSelect((value) => {
                  field.onChange(value);
                })}
                searchable
                value={field.input}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <Field of={form} path={["content"]}>
            {(field) => (
              <ConcreteActionField
                {...field.props}
                aria-label="その日限りのひとこと"
                error={field.errors?.[0]}
                itemName={selectedItemName}
                label="ひとこと"
                value={field.input}
                wrapLabel={false}
              />
            )}
          </Field>
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 2 }}>
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
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 2 }}>
          <LabelAlignedCell>
            <Button disabled={first === undefined} fullWidth type="submit">
              記録を足す
            </Button>
          </LabelAlignedCell>
        </Grid.Col>
      </Grid>
    </Form>
  );
}
