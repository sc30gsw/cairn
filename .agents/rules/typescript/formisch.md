---
description: Formisch (@formisch/react) forms — useForm({schema}) as single source of truth, Form/Field render props, Mantine input wiring
globs: ["src/features/**/schemas/*.ts", "src/features/**/components/*-form.tsx"]
alwaysApply: true
---

# Formisch Forms

## Install

`@formisch/react` builds directly on the project's existing Valibot schemas — no separate validation resolver/adapter package.

```bash
vp add @formisch/react
```

## `useForm({ schema })` is the single source of truth

`useForm` derives field types, initial values, and validation from one Valibot schema. Don't hand-write a parallel type or a separate `defaultValues` object to keep in sync — pass initial values through the same config via `initialInput` if needed.

```typescript
// CORRECT: one schema drives types, initial values, and validation
import { useForm } from "@formisch/react";
import { CreateProductSchema } from "~/features/products/schemas/create-product-schema";

const form = useForm({ schema: CreateProductSchema });

// WRONG: a hand-written type + a separate defaultValues object that can drift from the schema
type CreateProductInput = { name: string; price: number };
const [values, setValues] = useState<CreateProductInput>({ name: "", price: 0 });
```

## `<Form>` / `<Field>` render props

`<Form of={form} onSubmit={...}>` wraps the form; `<Field of={form} path={[...]}>` is a render-prop that supplies `field.input`, `field.errors`, and `field.props` for one schema path. Wire `field` into Mantine components — don't drop to a plain `<input>`.

```tsx
// CORRECT: Field's render prop feeds a Mantine input
import { Field, Form, useForm } from "@formisch/react";
import { Button, TextInput } from "@mantine/core";
import { CreateProductSchema } from "~/features/products/schemas/create-product-schema";

export function ProductForm({ onSuccess }: Record<"onSuccess", () => void>) {
  const form = useForm({ schema: CreateProductSchema });

  return (
    <Form
      of={form}
      onSubmit={(output) => {
        // `output` is fully typed from CreateProductSchema
        onSuccess();
      }}
    >
      <Field of={form} path={["name"]}>
        {(field) => (
          <TextInput {...field.props} error={field.errors?.[0]} label="名前" value={field.input} />
        )}
      </Field>
      <Button mt="md" type="submit">
        送信
      </Button>
    </Form>
  );
}

// WRONG: plain <input>, manual value/error wiring
<input value={name} onChange={(e) => setName(e.target.value)} />;
```

## Wiring Mantine inputs

`field.props` (`name`, `ref`, `onFocus`, `onChange`, `onBlur`, ...) assumes a native `ChangeEvent`-based `onChange`. Whether you can spread it as-is depends on the target Mantine component's own `onChange` shape.

**Event-based `onChange` (spread `field.props` directly)** — `TextInput`, `TimeInput` (`@mantine/dates`) both call `onChange` with a native `ChangeEvent<HTMLInputElement>`, same as `field.props.onChange` expects:

```tsx
import { TimeInput } from "@mantine/dates";

<Field of={form} path={["startedAt"]}>
  {(field) => (
    <TimeInput {...field.props} error={field.errors?.[0]} label="開始時刻" value={field.input} />
  )}
</Field>;
```

**Value-based `onChange` (override after spreading)** — `NumberInput` and `DateInput` (`@mantine/dates`) call `onChange` with the new value directly, not an event. Spread `field.props` for `name`/`ref`/`onBlur`/`onFocus`, then override `onChange` to forward the converted value to `field.onChange`:

```tsx
import { NumberInput } from "@mantine/core";
import { DateInput } from "@mantine/dates";

<Field of={form} path={["price"]}>
  {(field) => (
    <NumberInput
      {...field.props}
      onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
      error={field.errors?.[0]}
      label="価格"
      value={field.input}
    />
  )}
</Field>

<Field of={form} path={["birthday"]}>
  {(field) => (
    <DateInput
      {...field.props}
      onChange={(value) => field.onChange(value ?? undefined)}
      error={field.errors?.[0]}
      label="生年月日"
      value={field.input}
    />
  )}
</Field>;
```

## Schema placement

Formisch schemas follow the same placement as every other Valibot schema — see [valibot-validation.md](./valibot-validation.md):

```
src/features/products/schemas/
└── create-product-schema.ts
```

## Component conventions still apply

Components that use Formisch follow the project's normal React conventions: `function` declarations, named exports, no `export default` outside `src/routes/**`.

```typescript
// CORRECT
export function ProductForm({ onSuccess }: Record<"onSuccess", () => void>) { ... }

// WRONG
export default function ProductForm({ onSuccess }: Record<"onSuccess", () => void>) { ... }
```

## Related skills

- [valibot-validation.md](./valibot-validation.md) — schema placement and `InferOutput` conventions shared with Formisch schemas
- [../web/mantine-tailwind.md](../web/mantine-tailwind.md) — Mantine-first styling for the inputs Formisch's `Field` wires up
