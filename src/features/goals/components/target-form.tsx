import { Form, useField, useForm, type FormStore } from "@formisch/react";
import {
  Button,
  Grid,
  Input,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { TARGET_METRICS, TARGET_VALUE_LIMITS, type TargetMetric } from "~domain/domain";

import { LabelAlignedCell } from "~/components/label-aligned-cell";
import { isTargetMetric } from "~/features/goals/lib/goal-guards";
import { TargetSchema } from "~/features/goals/schemas/target-schema";
import type { SaveTargetInput } from "~/features/goals/types/mutations";
import type { TargetProgress } from "~/features/goals/types/target";
import { onRequiredSelect } from "~/lib/select";
import { TARGET_METRIC_SEGMENTS, TARGET_METRIC_UNITS } from "~/lib/target-metric-labels";
import type { CategoryDto } from "~/types/category";

const [defaultMetric] = TARGET_METRICS;

type TargetFormProps = {
  categories: CategoryDto[];
  onSave: (input: SaveTargetInput) => void;
  targets: TargetProgress[];
};

//? 1カテゴリ1件なので、カテゴリ選択がそのまま「新規/編集」の切り替えになる。
//? 選ばれたカテゴリの既存値を初期値にするため、値のフォームはカテゴリごとに貼り替える。
export function TargetForm({ categories, onSave, targets }: TargetFormProps) {
  //? 状態はユーザーが選んだカテゴリーだけを持つ。未選択とカテゴリー一覧の入れ替わりは先頭に寄せる
  const [categoryId, setCategoryId] = useState<CategoryDto["_id"]>();
  const [firstCategory] = categories;
  const selectedCategory =
    categories.find((category) => category._id === categoryId) ?? firstCategory;

  if (selectedCategory === undefined) {
    return (
      <Text c="dimmed" size="sm">
        先にカテゴリーを作ると、週間ターゲットを置けます。
      </Text>
    );
  }

  const existing = targets.find((target) => target.categoryId === selectedCategory._id);

  return (
    <Stack gap="sm">
      <Select
        allowDeselect={false}
        data={categories.map((category) => ({ label: category.name, value: category._id }))}
        description={
          existing === undefined
            ? "このカテゴリーの今週の実績を測ります。"
            : "このカテゴリーには既にターゲットがあります。保存すると置き換わります。"
        }
        label="カテゴリー"
        //? Select が返すのはただの文字列。一覧から引き当てて Id のブランドを取り戻す
        onChange={onRequiredSelect((value) => {
          setCategoryId(categories.find((category) => category._id === value)?._id);
        })}
        value={selectedCategory._id}
      />
      <TargetValueForm
        category={selectedCategory}
        existing={existing}
        key={selectedCategory._id}
        onSave={onSave}
      />
    </Stack>
  );
}

type TargetValueFormProps = {
  category: CategoryDto;
  existing: TargetProgress | undefined;
  onSave: (input: SaveTargetInput) => void;
};

function TargetValueForm({ category, existing, onSave }: TargetValueFormProps) {
  const form = useForm({
    initialInput: {
      metric: existing?.metric ?? defaultMetric,
      targetValue: existing?.targetValue ?? TARGET_VALUE_LIMITS.min,
    },
    schema: TargetSchema,
  });
  const metricField = useField(form, { path: ["metric"] });
  const metric = metricField.input ?? defaultMetric;

  return (
    <Form of={form} onSubmit={(output) => onSave({ ...output, categoryId: category._id })}>
      <Grid align="flex-start" gap="sm">
        <Grid.Col span={{ base: 12, sm: 5 }}>
          <Input.Wrapper error={metricField.errors?.[0]} label="計測">
            <SegmentedControl
              data={TARGET_METRIC_SEGMENTS}
              fullWidth
              //? SegmentedControl は値ベースの onChange。ドメイン値かどうかは guard で確かめる
              onChange={(value) => {
                if (isTargetMetric(value)) {
                  metricField.onChange(value);
                }
              }}
              value={metric}
            />
          </Input.Wrapper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <TargetValueField form={form} metric={metric} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 3 }}>
          <LabelAlignedCell>
            <Button fullWidth type="submit">
              {existing === undefined ? "ターゲットを追加" : "ターゲットを更新"}
            </Button>
          </LabelAlignedCell>
        </Grid.Col>
      </Grid>
    </Form>
  );
}

type TargetValueFieldProps = {
  form: FormStore<typeof TargetSchema>;
  metric: TargetMetric;
};

function TargetValueField({ form, metric }: TargetValueFieldProps) {
  const field = useField(form, { path: ["targetValue"] });

  return (
    <NumberInput
      {...field.props}
      error={field.errors?.[0]}
      label="目標値"
      //? 1週は7日しかない。実施日のときだけ上限を出す
      max={metric === "days" ? TARGET_VALUE_LIMITS.maxDays : undefined}
      min={TARGET_VALUE_LIMITS.min}
      onChange={(value) => field.onChange(value === "" ? undefined : Number(value))}
      suffix={` ${TARGET_METRIC_UNITS[metric]}`}
      value={field.input ?? ""}
    />
  );
}
