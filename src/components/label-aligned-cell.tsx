import { Input } from "@mantine/core";
import type { ReactNode } from "react";

export function LabelAlignedCell({ children }: Record<"children", ReactNode>) {
  return <Input.Wrapper label=" ">{children}</Input.Wrapper>;
}
