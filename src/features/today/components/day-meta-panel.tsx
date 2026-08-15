import { Button, Group, SegmentedControl, Textarea } from "@mantine/core";
import { useState } from "react";

type Condition = "好調" | "普通" | "崩れた";

type DayMetaPanelProps = {
  condition: Condition | null;
  memo: null | string;
  onSaveCondition: (condition: Condition) => void;
  onSaveMemo: (memo: string) => void;
};

export function DayMetaPanel({ condition, memo, onSaveCondition, onSaveMemo }: DayMetaPanelProps) {
  const [text, setText] = useState(memo ?? "");

  return (
    <section aria-label="コンディションとメモ">
      <SegmentedControl
        aria-label="コンディション"
        data={[
          { label: "未設定", value: "unset" },
          { label: "好調", value: "好調" },
          { label: "普通", value: "普通" },
          { label: "崩れた", value: "崩れた" },
        ]}
        onChange={(value) => {
          if (value === "好調" || value === "普通" || value === "崩れた") {
            onSaveCondition(value);
          }
        }}
        value={condition ?? "unset"}
      />
      <Textarea
        label="メモ"
        mt="sm"
        onBlur={() => onSaveMemo(text)}
        onChange={(event) => setText(event.currentTarget.value)}
        value={text}
      />
      <Group mt="xs">
        <Button onClick={() => onSaveMemo(text)} variant="light">
          メモを保存
        </Button>
      </Group>
    </section>
  );
}
