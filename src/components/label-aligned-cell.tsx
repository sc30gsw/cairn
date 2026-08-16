import { Input } from "@mantine/core";
import type { ReactNode } from "react";

//? ラベル付き入力と同じ行に置くボタン等を、空白ラベル分だけ下げて高さを揃える
export function LabelAlignedCell({ children }: Record<"children", ReactNode>) {
  return <Input.Wrapper label=" ">{children}</Input.Wrapper>;
}
