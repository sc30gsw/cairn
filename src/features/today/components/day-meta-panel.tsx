import { Button, Group, SegmentedControl, Textarea } from "@mantine/core";

type DayMetaPanelProps = {
  condition: "好調" | "普通" | "崩れた" | null;
  memo: null | string;
  onSaveCondition: (condition: "好調" | "普通" | "崩れた") => void;
  onSaveMemo: (memo: string) => void;
};

export function DayMetaPanel({ condition, memo, onSaveCondition, onSaveMemo }: DayMetaPanelProps) {
  return (
    <section aria-label="コンディションとメモ">
      <SegmentedControl
        aria-label="コンディション"
        data={["好調", "普通", "崩れた"]}
        onChange={(value) => {
          if (value === "好調" || value === "普通" || value === "崩れた") {
            onSaveCondition(value);
          }
        }}
        value={condition ?? "普通"}
      />
      <Textarea
        defaultValue={memo ?? ""}
        label="メモ"
        mt="sm"
        onBlur={(event) => onSaveMemo(event.currentTarget.value)}
      />
      <Group mt="xs">
        <Button
          onClick={(event) => {
            const form = event.currentTarget.closest("section");
            const textarea = form?.querySelector("textarea");
            onSaveMemo(textarea?.value ?? "");
          }}
          variant="light"
        >
          メモを保存
        </Button>
      </Group>
    </section>
  );
}
